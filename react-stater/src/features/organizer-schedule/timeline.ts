import type { BookingDto } from '../workspaces/api/booking-types';
import type { BlockedSlot, OperationResource } from '../organizer-operations/api';

export interface TimelineEvent {
  key: string;
  resourceId: number;
  parentRoomId: number | null;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  booking?: BookingDto;
  block?: BlockedSlot;
}
export function timelineEvents(
  bookings: BookingDto[],
  blocks: BlockedSlot[],
  resources: OperationResource[],
  now: Date
): TimelineEvent[] {
  const catalog = new Map(resources.map((r) => [r.id, r]));
  return [
    ...bookings
      .filter(
        (b) =>
          !['CANCELLED', 'EXPIRED'].includes(b.status) &&
          !(
            b.status === 'PENDING_PAYMENT' &&
            b.holdExpiresAt &&
            new Date(b.holdExpiresAt) <= new Date(b.serverTime || now)
          )
      )
      .map((b) => ({
        key: `booking:${b.id}`,
        resourceId: b.resourceId,
        parentRoomId: catalog.get(b.resourceId)?.parentRoomId ?? null,
        title: b.bookingCode,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        booking: b
      })),
    ...blocks.map((b) => ({
      key: `block:${b.id}`,
      resourceId: b.resourceId,
      parentRoomId: b.parentRoomId,
      title: b.reason,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.blockType,
      block: b
    }))
  ];
}
export function eventsForResource(
  events: TimelineEvent[],
  resource: OperationResource
): TimelineEvent[] {
  return events.filter(
    (e) =>
      e.resourceId === resource.id ||
      resource.parentRoomId === e.resourceId ||
      (resource.category === 'ROOM' && e.parentRoomId === resource.id)
  );
}
/** Clip to the visible interval, preserving bookings that span midnight or several days. */
export function positionEvents(events: TimelineEvent[], from: string, to: string) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const positions = events
    .map((event) => ({
      event,
      start: Math.max(start, new Date(event.startTime).getTime()),
      end: Math.min(end, new Date(event.endTime).getTime())
    }))
    .filter((e) => e.start < e.end);
  // Sorting a newly-created array never mutates query data.
  positions.sort(
    (a, b) => a.start - b.start || a.end - b.end || a.event.key.localeCompare(b.event.key)
  );
  const lanes: number[] = [];
  return positions.map((item) => {
    let lane = lanes.findIndex((laneEnd) => laneEnd <= item.start);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = item.end;
    return {
      ...item,
      lane,
      left: ((item.start - start) / (end - start)) * 100,
      width: ((item.end - item.start) / (end - start)) * 100
    };
  });
}
