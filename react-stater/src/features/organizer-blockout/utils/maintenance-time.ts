import type { BookingDto } from '../../workspaces/api/booking-types';
import type { BlockedSlot } from '../../organizer-operations/api';
import type { MaintenanceSchedule, MaintenanceTarget } from '../api';

export interface MaintenanceConflict {
  start: string;
  end: string | null;
  kind: 'booking' | 'hold' | 'hold-window' | 'maintenance' | 'blocked';
  name: string;
}

/** Match the backend's room/seat locking scope without disclosing customer details. */
export function maintenanceConflicts(
  targets: MaintenanceTarget[],
  selected: string[],
  bookings: BookingDto[],
  schedules: MaintenanceSchedule[],
  blocks: BlockedSlot[],
  now: number
): MaintenanceConflict[] {
  const resources = targets.filter((target) => target.key.startsWith('RESOURCE:'));
  const affected = new Set<number>();
  for (const target of targets.filter((item) => selected.includes(item.key))) {
    const id = target.resourceId ?? target.parentRoomId;
    if (id == null) continue;
    affected.add(id);
    const resource = resources.find((item) => item.resourceId === id);
    if (resource?.kind === 'ROOM') {
      for (const child of resources)
        if (child.parentRoomId === id && child.resourceId != null) affected.add(child.resourceId);
    } else if (resource?.parentRoomId != null) affected.add(resource.parentRoomId);
  }
  const result: MaintenanceConflict[] = [];
  for (const booking of bookings) {
    if (!affected.has(booking.resourceId)) continue;
    const hold = booking.status === 'PENDING_PAYMENT';
    if (hold && booking.holdExpiresAt && Date.parse(booking.holdExpiresAt) <= now) continue;
    if (!hold && !['CONFIRMED', 'CHECKED_IN', 'PENDING_APPROVAL'].includes(booking.status))
      continue;
    if (
      (hold || booking.status === 'PENDING_APPROVAL') &&
      booking.holdExpiresAt &&
      Date.parse(booking.holdExpiresAt) > now
    ) {
      result.push({
        start:
          booking.createdAt ||
          new Date(now - new Date(now).getTimezoneOffset() * 60000).toISOString().slice(0, 19),
        end: booking.holdExpiresAt,
        kind: 'hold-window',
        name: booking.resourceName || booking.resourceCode
      });
    }
    result.push({
      start: booking.startTime,
      end: booking.endTime,
      kind: hold ? 'hold' : 'booking',
      name: booking.resourceName || booking.resourceCode
    });
  }
  for (const schedule of schedules)
    if (
      schedule.wholeWorkspace ||
      selected.includes(schedule.targetKey) ||
      (schedule.targetKeys ?? [schedule.targetKey]).some(
        (key) =>
          selected.includes(key) ||
          (key.startsWith('RESOURCE:') && affected.has(Number(key.slice(9))))
      )
    )
      result.push({
        start: schedule.startTime,
        end: schedule.endTime,
        kind: 'maintenance',
        name: schedule.name
      });
  for (const block of blocks)
    if (block.blockType !== 'MAINTENANCE' && affected.has(block.resourceId))
      result.push({
        start: block.startTime,
        end: block.endTime,
        kind: 'blocked',
        name: block.resourceName
      });
  // eslint-disable-next-line unicorn/no-array-sort -- This array is created locally and is not shared with callers.
  return result.sort((a, b) => a.start.localeCompare(b.start));
}

/** Half-open intervals permit maintenance immediately before or after a reservation. */
export function maintenanceTimeConflict(
  start: string,
  end: string | undefined,
  conflicts: MaintenanceConflict[]
) {
  const from = start.length === 16 ? start + ':00' : start;
  const to = end?.length === 16 ? end + ':00' : end;
  return conflicts.find(
    (item) => from < (item.end ?? '9999') && (to ? to > item.start : from >= item.start)
  );
}

/** Include exact booking boundaries alongside quick half-hour choices. */
export function maintenanceTimeChoices(day: string, conflicts: MaintenanceConflict[], value = '') {
  const times = new Set<string>();
  for (let minute = 0; minute < 1440; minute += 30)
    times.add(
      String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0')
    );
  for (const item of conflicts)
    for (const boundary of [item.start, item.end])
      if (boundary?.startsWith(day + 'T')) times.add(boundary.slice(11, 19));
  if (value.startsWith(day + 'T')) times.add(value.slice(11));
  // Normalize seconds so equivalent choices do not appear twice.
  const choices = [...new Set([...times].map((time) => (time.length === 5 ? time + ':00' : time)))];
  // eslint-disable-next-line unicorn/no-array-sort -- Sort only the newly created list of choices.
  return choices.sort();
}

export type MaintenanceTimeIssue =
  | { code: 'missing' | 'past' | 'order' | 'duration' }
  | { code: 'conflict'; conflict: MaintenanceConflict };

/** Check the complete interval, including conflicts entirely enclosed by the selection. */
export function maintenancePeriodIssue(
  start: string,
  end: string,
  conflicts: MaintenanceConflict[],
  now: number
): MaintenanceTimeIssue | undefined {
  const from = Date.parse(start);
  const to = Date.parse(end);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return { code: 'missing' };
  if (from < now) return { code: 'past' };
  if (to <= from) return { code: 'order' };
  if (to - from > 366 * 86400000) return { code: 'duration' };
  const conflict = maintenanceTimeConflict(start, end, conflicts);
  return conflict ? { code: 'conflict', conflict } : undefined;
}

/** Start choices remain independent of the old end, so users can move to another free gap. */
export function maintenanceChoiceIssue(
  boundary: 'start' | 'end',
  candidate: string,
  start: string,
  conflicts: MaintenanceConflict[],
  now: number
): MaintenanceTimeIssue | undefined {
  if (boundary === 'end') return maintenancePeriodIssue(start, candidate, conflicts, now);
  if (!Number.isFinite(Date.parse(candidate))) return { code: 'missing' };
  if (Date.parse(candidate) < now) return { code: 'past' };
  const conflict = maintenanceTimeConflict(candidate, undefined, conflicts);
  return conflict ? { code: 'conflict', conflict } : undefined;
}

function displayBoundary(value: string) {
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)} ${value.slice(11, 19)}`;
}

export function maintenanceIssueText(
  issue: MaintenanceTimeIssue | undefined,
  c: (english: string, vietnamese: string) => string
): string {
  if (!issue) return '';
  switch (issue.code) {
    case 'missing':
      return c('Choose both start and end times.', 'Chọn đủ giờ bắt đầu và kết thúc.');
    case 'past':
      return c('The start time has already passed.', 'Giờ bắt đầu đã qua. Vui lòng chọn giờ mới.');
    case 'order':
      return c('End time must be after start time.', 'Giờ kết thúc phải sau giờ bắt đầu.');
    case 'duration':
      return c('Maintenance cannot exceed 366 days.', 'Khoảng bảo trì không quá 366 ngày.');
    case 'conflict': {
      const labels = {
        booking: c('Already booked', 'Đã có người đặt'),
        hold: c('Active reservation hold', 'Đang giữ chỗ'),
        'hold-window': c('Checkout hold is still active', 'Thời gian giữ chỗ còn hiệu lực'),
        maintenance: c('Existing maintenance', 'Đã có lịch bảo trì'),
        blocked: c('Blocked period', 'Khung giờ bị khóa')
      };
      return `${labels[issue.conflict.kind]} · ${issue.conflict.name} · ${displayBoundary(issue.conflict.start)} → ${issue.conflict.end ? displayBoundary(issue.conflict.end) : c('until removed', 'đến khi gỡ lịch')}`;
    }
  }
}
