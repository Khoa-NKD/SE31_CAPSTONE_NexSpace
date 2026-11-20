import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { ResourceAvailabilityEventPayloadDto } from '../api/types.ts';

describe('Real-time Availability SSE & Auto-Deselect Logic Tests', () => {
  const currentUserId = 100;

  function shouldAutoDeselect(
    selectedResourceId: number | null,
    payload: ResourceAvailabilityEventPayloadDto,
    loggedInUserId: number | null,
    activeUserHoldResourceId?: number | null
  ): boolean {
    if (!selectedResourceId || selectedResourceId !== payload.resourceId) {
      return false;
    }

    const isOccupiedByMe =
      (payload.customerId && loggedInUserId && payload.customerId === loggedInUserId) ||
      activeUserHoldResourceId === payload.resourceId;

    const isOccupiedStatus =
      payload.newStatus === 'HOLDING' ||
      payload.newStatus === 'BOOKED' ||
      payload.newStatus === 'BLOCKED' ||
      payload.newStatus === 'DISABLED';

    return Boolean(isOccupiedStatus && !isOccupiedByMe);
  }

  it('triggers auto-deselect when another customer holds the selected desk', () => {
    const payload: ResourceAvailabilityEventPayloadDto = {
      workspaceId: 1,
      resourceId: 42,
      resourceLabel: 'D-01',
      parentRoomId: null,
      bookingId: 88,
      bookingCode: 'BK-20261120-001',
      customerId: 999, // Another customer
      newStatus: 'HOLDING',
      eventType: 'HOLD_CREATED',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T12:00:00',
      holdExpiresAt: '2026-11-20T09:10:00',
      occurredAt: '2026-11-20T09:00:00'
    };

    const deselect = shouldAutoDeselect(42, payload, currentUserId, null);
    assert.strictEqual(deselect, true, 'Should automatically deselect when another user holds the resource');
  });

  it('does NOT trigger auto-deselect when the current user is the one who created the hold', () => {
    const payload: ResourceAvailabilityEventPayloadDto = {
      workspaceId: 1,
      resourceId: 42,
      resourceLabel: 'D-01',
      parentRoomId: null,
      bookingId: 88,
      bookingCode: 'BK-20261120-001',
      customerId: currentUserId, // Current user
      newStatus: 'HOLDING',
      eventType: 'HOLD_CREATED',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T12:00:00',
      holdExpiresAt: '2026-11-20T09:10:00',
      occurredAt: '2026-11-20T09:00:00'
    };

    const deselect = shouldAutoDeselect(42, payload, currentUserId, 42);
    assert.strictEqual(deselect, false, 'Should preserve selection when current user created the hold');
  });

  it('does NOT trigger auto-deselect when resource becomes AVAILABLE again', () => {
    const payload: ResourceAvailabilityEventPayloadDto = {
      workspaceId: 1,
      resourceId: 42,
      resourceLabel: 'D-01',
      parentRoomId: null,
      bookingId: null,
      bookingCode: null,
      customerId: null,
      newStatus: 'AVAILABLE',
      eventType: 'HOLD_EXPIRED',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T12:00:00',
      holdExpiresAt: null,
      occurredAt: '2026-11-20T09:10:01'
    };

    const deselect = shouldAutoDeselect(42, payload, currentUserId, null);
    assert.strictEqual(deselect, false, 'Should not deselect when resource transitions to AVAILABLE');
  });

  it('triggers auto-deselect when resource is BLOCKED or DISABLED for maintenance', () => {
    const blockedPayload: ResourceAvailabilityEventPayloadDto = {
      workspaceId: 1,
      resourceId: 42,
      resourceLabel: 'D-01',
      parentRoomId: null,
      bookingId: null,
      bookingCode: null,
      customerId: null,
      newStatus: 'BLOCKED',
      eventType: 'RESOURCE_BLOCKED',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T12:00:00',
      holdExpiresAt: null,
      occurredAt: '2026-11-20T09:00:00'
    };

    assert.strictEqual(shouldAutoDeselect(42, blockedPayload, currentUserId), true);
  });

  it('ignores events for non-selected resources', () => {
    const otherResourcePayload: ResourceAvailabilityEventPayloadDto = {
      workspaceId: 1,
      resourceId: 99, // Different resource
      resourceLabel: 'D-99',
      parentRoomId: null,
      bookingId: 12,
      bookingCode: 'BK-OTHER',
      customerId: 555,
      newStatus: 'BOOKED',
      eventType: 'BOOKING_CONFIRMED',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T12:00:00',
      holdExpiresAt: null,
      occurredAt: '2026-11-20T09:00:00'
    };

    assert.strictEqual(shouldAutoDeselect(42, otherResourcePayload, currentUserId), false);
  });
});
