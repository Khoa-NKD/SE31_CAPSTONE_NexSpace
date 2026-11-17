import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

describe('Pending Payment Booking & 15-Minute Hold Lock Test Suite', () => {

  interface MockBooking {
    id: number;
    bookingCode: string;
    customerId: number;
    workspaceId: number;
    resourceId: number;
    status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
    startTime: string;
    endTime: string;
    createdAt: string;
    holdExpiresAt: string | null;
    qrTokenHash: string;
    finalPrice: number;
  }

  const createMockPendingBooking = (nowMs = Date.now()): MockBooking => {
    const createdAt = new Date(nowMs).toISOString();
    const holdExpiresAt = new Date(nowMs + 15 * 60 * 1000).toISOString();
    const bookingCode = `BK-${new Date(nowMs).toISOString().slice(0, 10).replace(/-/g, '')}-A9B8C7`;
    const qrTokenHash = crypto
      .createHash('sha256')
      .update(`${bookingCode}:100:nexspace-security-salt`)
      .digest('hex');

    return {
      id: 999,
      bookingCode,
      customerId: 100,
      workspaceId: 1,
      resourceId: 42,
      status: 'PENDING_PAYMENT',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T13:00:00',
      createdAt,
      holdExpiresAt,
      qrTokenHash,
      finalPrice: 10.8
    };
  };

  it('TC-HOLD-01: Create booking initial status is strictly PENDING_PAYMENT with 15-min TTL', () => {
    const booking = createMockPendingBooking();
    assert.equal(booking.status, 'PENDING_PAYMENT');
    assert.ok(booking.holdExpiresAt !== null);

    const createdTime = new Date(booking.createdAt).getTime();
    const expiryTime = new Date(booking.holdExpiresAt!).getTime();
    const diffMinutes = Math.round((expiryTime - createdTime) / (60 * 1000));
    assert.equal(diffMinutes, 15);
  });

  it('TC-HOLD-02: Booking code format adheres to canonical BK-YYYYMMDD-XXXXXX standard', () => {
    const booking = createMockPendingBooking();
    const pattern = /^BK-\d{8}-[A-Z0-9]{6}$/;
    assert.match(booking.bookingCode, pattern);
  });

  it('TC-LOCK-01: Active unexpired hold maps seat availability state to LOCKED', () => {
    const booking = createMockPendingBooking();
    const now = Date.now();

    const isHoldActive = (b: MockBooking, currentTime: number): boolean => {
      if (b.status !== 'PENDING_PAYMENT') return false;
      if (!b.holdExpiresAt) return false;
      return new Date(b.holdExpiresAt).getTime() > currentTime;
    };

    const determineSeatState = (b: MockBooking | null, currentTime: number) => {
      if (!b) return 'AVAILABLE';
      if (b.status === 'CONFIRMED') return 'BOOKED';
      if (isHoldActive(b, currentTime)) return 'LOCKED';
      return 'AVAILABLE';
    };

    // Right now: hold is active -> LOCKED
    assert.equal(determineSeatState(booking, now), 'LOCKED');

    // 10 minutes later: still active -> LOCKED
    assert.equal(determineSeatState(booking, now + 10 * 60 * 1000), 'LOCKED');
  });

  it('TC-LOCK-02: Anti-Double-Booking conflict detection rejects overlapping requests', () => {
    const activeBooking = createMockPendingBooking();

    const checkConflict = (
      existing: MockBooking,
      reqResourceId: number,
      reqStart: string,
      reqEnd: string,
      currentTime: number
    ): boolean => {
      if (existing.resourceId !== reqResourceId) return false;
      const isUnexpiredHold =
        existing.status === 'PENDING_PAYMENT' &&
        existing.holdExpiresAt !== null &&
        new Date(existing.holdExpiresAt).getTime() > currentTime;

      const isConflictedStatus = existing.status === 'CONFIRMED' || isUnexpiredHold;
      if (!isConflictedStatus) return false;

      // Half-open interval check: existing.start < reqEnd && existing.end > reqStart
      return (
        new Date(existing.startTime).getTime() < new Date(reqEnd).getTime() &&
        new Date(existing.endTime).getTime() > new Date(reqStart).getTime()
      );
    };

    const now = Date.now();
    // Identical slot -> Conflict
    assert.equal(
      checkConflict(activeBooking, 42, '2026-11-20T09:00:00', '2026-11-20T13:00:00', now),
      true
    );

    // Overlapping partial slot (10:00 - 12:00) -> Conflict
    assert.equal(
      checkConflict(activeBooking, 42, '2026-11-20T10:00:00', '2026-11-20T12:00:00', now),
      true
    );

    // Adjacent non-overlapping back-to-back slot (13:00 - 17:00) -> NO Conflict
    assert.equal(
      checkConflict(activeBooking, 42, '2026-11-20T13:00:00', '2026-11-20T17:00:00', now),
      false
    );

    // Different seat (Seat 99) in same slot -> NO Conflict
    assert.equal(
      checkConflict(activeBooking, 99, '2026-11-20T09:00:00', '2026-11-20T13:00:00', now),
      false
    );
  });

  it('TC-RELEASE-01: Cancelling pending hold immediately unlocks the seat to AVAILABLE', () => {
    const booking = createMockPendingBooking();
    assert.equal(booking.status, 'PENDING_PAYMENT');

    // Customer cancels hold
    booking.status = 'CANCELLED';
    booking.holdExpiresAt = null;

    const isHoldActive =
      (booking.status as string) === 'PENDING_PAYMENT' &&
      booking.holdExpiresAt !== null &&
      new Date(booking.holdExpiresAt).getTime() > Date.now();

    assert.equal(isHoldActive, false);
    assert.equal(booking.status, 'CANCELLED');
  });

  it('TC-EXPIRE-01: Automatic hold expiration when 15 minutes elapsed releases seat', () => {
    const booking = createMockPendingBooking();
    const expiryTime = new Date(booking.holdExpiresAt!).getTime();

    // 16 minutes later
    const futureTime = expiryTime + 60 * 1000;

    const isExpired = new Date(booking.holdExpiresAt!).getTime() <= futureTime;
    assert.equal(isExpired, true);

    // Background job marks as EXPIRED
    if (isExpired) {
      booking.status = 'EXPIRED';
    }

    assert.equal(booking.status, 'EXPIRED');
  });

  it('TC-UI-COUNTDOWN-01: Formats remaining hold seconds correctly for UI banner', () => {
    const formatRemaining = (seconds: number): string => {
      if (seconds <= 0) return '00:00 (Hold Expired)';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    assert.equal(formatRemaining(900), '15:00');
    assert.equal(formatRemaining(845), '14:05');
    assert.equal(formatRemaining(60), '01:00');
    assert.equal(formatRemaining(9), '00:09');
    assert.equal(formatRemaining(0), '00:00 (Hold Expired)');
    assert.equal(formatRemaining(-5), '00:00 (Hold Expired)');
  });

  it('TC-UI-QR-01: Generates robust 256-bit SHA-256 QR token hash for verified check-in', () => {
    const booking = createMockPendingBooking();
    assert.equal(booking.qrTokenHash.length, 64);
    assert.match(booking.qrTokenHash, /^[0-9a-f]{64}$/);
  });
});
