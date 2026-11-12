import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Booking Cancellation & Policy Enforcement Test Suite', () => {

  interface CancellationRule {
    minHoursBeforeStart: number;
    refundPercent: number;
  }

  interface BookingRecord {
    id: number;
    bookingCode: string;
    customerId: number;
    customerName: string;
    organizerId: number;
    workspaceId: number;
    workspaceName: string;
    resourceId: number;
    resourceCode: string;
    startTime: string;
    endTime: string;
    finalPrice: number;
    status: 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';
    holdExpiresAt: string | null;
    cancelReason?: string | null;
    cancelSource?: string | null;
    cancelledAt?: string | null;
    refundPercent?: number;
    refundAmount?: number;
  }

  interface CancellationPreview {
    bookingId: number;
    bookingCode: string;
    status: string;
    startTime: string;
    hoursBeforeStart: number;
    finalPrice: number;
    refundPercent: number;
    refundAmount: number;
    isHostCancellation: boolean;
    canCancel: boolean;
    cancellationPolicyExplanation: string;
    rules: CancellationRule[];
  }

  const workspaceRules: Record<number, CancellationRule[]> = {
    1: [
      { minHoursBeforeStart: 24, refundPercent: 100 },
      { minHoursBeforeStart: 12, refundPercent: 50 },
      { minHoursBeforeStart: 2, refundPercent: 0 }
    ],
    2: [
      { minHoursBeforeStart: 48, refundPercent: 100 },
      { minHoursBeforeStart: 24, refundPercent: 50 }
    ]
  };

  let mockBookings: BookingRecord[];

  beforeEach(() => {
    const now = new Date();
    // 36 hours ahead
    const t36h = new Date(now.getTime() + 36 * 3600 * 1000).toISOString();
    // 16 hours ahead
    const t16h = new Date(now.getTime() + 16 * 3600 * 1000).toISOString();
    // 4 hours ahead
    const t4h = new Date(now.getTime() + 4 * 3600 * 1000).toISOString();
    // 2 hours ago (already past start)
    const tPast = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();

    mockBookings = [
      {
        id: 8001,
        bookingCode: 'BK-CONF-36H',
        customerId: 100, // Customer Alice
        customerName: 'Alice Nguyen',
        organizerId: 10, // Organizer Alpha
        workspaceId: 1,
        workspaceName: 'NexSpace Central Tower',
        resourceId: 101,
        resourceCode: 'DESK-A12',
        startTime: t36h,
        endTime: new Date(new Date(t36h).getTime() + 4 * 3600 * 1000).toISOString(),
        finalPrice: 200000,
        status: 'CONFIRMED',
        holdExpiresAt: null
      },
      {
        id: 8002,
        bookingCode: 'BK-CONF-16H',
        customerId: 100,
        customerName: 'Alice Nguyen',
        organizerId: 10,
        workspaceId: 1,
        workspaceName: 'NexSpace Central Tower',
        resourceId: 102,
        resourceCode: 'CONF-B01',
        startTime: t16h,
        endTime: new Date(new Date(t16h).getTime() + 2 * 3600 * 1000).toISOString(),
        finalPrice: 500000,
        status: 'CONFIRMED',
        holdExpiresAt: null
      },
      {
        id: 8003,
        bookingCode: 'BK-CONF-4H',
        customerId: 100,
        customerName: 'Alice Nguyen',
        organizerId: 10,
        workspaceId: 1,
        workspaceName: 'NexSpace Central Tower',
        resourceId: 103,
        resourceCode: 'POD-01',
        startTime: t4h,
        endTime: new Date(new Date(t4h).getTime() + 2 * 3600 * 1000).toISOString(),
        finalPrice: 100000,
        status: 'CONFIRMED',
        holdExpiresAt: null
      },
      {
        id: 8004,
        bookingCode: 'BK-HOLD-PENDING',
        customerId: 100,
        customerName: 'Alice Nguyen',
        organizerId: 10,
        workspaceId: 1,
        workspaceName: 'NexSpace Central Tower',
        resourceId: 104,
        resourceCode: 'DESK-A14',
        startTime: t36h,
        endTime: new Date(new Date(t36h).getTime() + 4 * 3600 * 1000).toISOString(),
        finalPrice: 150000,
        status: 'PENDING_PAYMENT',
        holdExpiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
      },
      {
        id: 8005,
        bookingCode: 'BK-COMPLETED',
        customerId: 100,
        customerName: 'Alice Nguyen',
        organizerId: 10,
        workspaceId: 1,
        workspaceName: 'NexSpace Central Tower',
        resourceId: 105,
        resourceCode: 'DESK-A15',
        startTime: tPast,
        endTime: now.toISOString(),
        finalPrice: 100000,
        status: 'COMPLETED',
        holdExpiresAt: null
      },
      {
        id: 8006,
        bookingCode: 'BK-OTHER-ORGANIZER',
        customerId: 200, // Customer Bob
        customerName: 'Bob Tran',
        organizerId: 20, // Organizer Beta
        workspaceId: 2,
        workspaceName: 'Innovation Hub',
        resourceId: 201,
        resourceCode: 'ROOM-B01',
        startTime: t36h,
        endTime: new Date(new Date(t36h).getTime() + 2 * 3600 * 1000).toISOString(),
        finalPrice: 400000,
        status: 'CONFIRMED',
        holdExpiresAt: null
      }
    ];
  });

  // Simulation Logic matching BookingServiceImpl.java
  function getCancellationPreview(callerUserId: number, callerRole: 'CUSTOMER' | 'ORGANIZER' | 'ADMIN', bookingId: number): CancellationPreview {
    const booking = mockBookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    const isOwner = booking.customerId === callerUserId;
    const isHost = booking.organizerId === callerUserId;
    const isAdmin = callerRole === 'ADMIN';

    if (!isOwner && !isHost && !isAdmin) {
      throw new Error('Booking not found or unauthorized');
    }

    const canCancel = booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && booking.status !== 'CHECKED_IN';
    const now = new Date();
    const startTime = new Date(booking.startTime);
    const hoursBeforeStart = Math.round((startTime.getTime() - now.getTime()) / (3600 * 1000));

    const rules = workspaceRules[booking.workspaceId] || [];
    let refundPercent = 0;
    let refundAmount = 0;
    let explanation = '';

    const isHostCancellation = isHost || isAdmin;
    if (isHostCancellation) {
      refundPercent = 100;
      refundAmount = booking.finalPrice;
      explanation = 'Organizer/Host hủy đơn: Khách hàng được hoàn tiền 100% toàn bộ chi phí theo chính sách bảo vệ người dùng.';
    } else if (booking.status === 'PENDING_PAYMENT' || booking.status === 'PENDING_APPROVAL') {
      refundPercent = 0;
      refundAmount = 0;
      explanation = 'Đơn giữ chỗ chưa thanh toán. Chỗ ngồi sẽ được giải phóng ngay lập tức mà không phát sinh phí.';
    } else if (hoursBeforeStart <= 0) {
      refundPercent = 0;
      refundAmount = 0;
      explanation = 'Đã quá thời gian bắt đầu sử dụng. Không thể hoàn tiền.';
    } else {
      for (const r of rules) {
        if (hoursBeforeStart >= r.minHoursBeforeStart) {
          refundPercent = r.refundPercent;
          break;
        }
      }
      refundAmount = Math.round((booking.finalPrice * refundPercent) / 100);
      explanation = `Hủy trước ${hoursBeforeStart} giờ. Áp dụng chính sách hoàn trả ${refundPercent}% giá trị đơn hàng.`;
    }

    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      startTime: booking.startTime,
      hoursBeforeStart,
      finalPrice: booking.finalPrice,
      refundPercent,
      refundAmount,
      isHostCancellation,
      canCancel,
      cancellationPolicyExplanation: explanation,
      rules
    };
  }

  function cancelBooking(
    callerUserId: number,
    callerRole: 'CUSTOMER' | 'ORGANIZER' | 'ADMIN',
    bookingId: number,
    cancelReason?: string
  ): BookingRecord {
    const booking = mockBookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    const isOwner = booking.customerId === callerUserId;
    const isHost = booking.organizerId === callerUserId;
    const isAdmin = callerRole === 'ADMIN';

    if (!isOwner && !isHost && !isAdmin) {
      throw new Error('Booking not found or unauthorized');
    }

    if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED' || booking.status === 'CHECKED_IN') {
      throw new Error(`Cannot cancel booking in current status: ${booking.status}`);
    }

    const cancelSource = isAdmin ? 'ADMINISTRATOR' : isHost ? 'ORGANIZER' : 'CUSTOMER';
    const preview = getCancellationPreview(callerUserId, callerRole, bookingId);

    const now = new Date();
    booking.status = 'CANCELLED';
    booking.holdExpiresAt = null;
    booking.cancelSource = cancelSource;
    booking.cancelReason = cancelReason || (cancelSource === 'ORGANIZER' ? 'Organizer cancelled' : 'Customer cancelled');
    booking.cancelledAt = now.toISOString();
    booking.refundPercent = preview.refundPercent;
    booking.refundAmount = preview.refundAmount;

    return booking;
  }

  // --- Automated Tests ---

  it('TC-CAN-01: Customer cancels PENDING_PAYMENT booking -> frees hold slot, refund is 0', () => {
    const result = cancelBooking(100, 'CUSTOMER', 8004, 'Khách hàng đổi ý');

    assert.strictEqual(result.status, 'CANCELLED');
    assert.strictEqual(result.holdExpiresAt, null);
    assert.strictEqual(result.cancelSource, 'CUSTOMER');
    assert.strictEqual(result.refundPercent, 0);
    assert.strictEqual(result.refundAmount, 0);
    assert.strictEqual(result.cancelReason, 'Khách hàng đổi ý');
    assert.ok(result.cancelledAt !== null);
  });

  it('TC-CAN-02: Customer cancels CONFIRMED booking 36h before start -> 100% refund', () => {
    const result = cancelBooking(100, 'CUSTOMER', 8001, 'Kế hoạch công tác dời tuần sau');

    assert.strictEqual(result.status, 'CANCELLED');
    assert.strictEqual(result.cancelSource, 'CUSTOMER');
    assert.strictEqual(result.refundPercent, 100);
    assert.strictEqual(result.refundAmount, 200000);
    assert.strictEqual(result.holdExpiresAt, null);
  });

  it('TC-CAN-03: Customer cancels CONFIRMED booking 16h before start -> 50% partial refund', () => {
    const result = cancelBooking(100, 'CUSTOMER', 8002, 'Bận họp đột xuất');

    assert.strictEqual(result.status, 'CANCELLED');
    assert.strictEqual(result.cancelSource, 'CUSTOMER');
    assert.strictEqual(result.refundPercent, 50);
    assert.strictEqual(result.refundAmount, 250000); // 500k * 50%
  });

  it('TC-CAN-04: Customer cancels CONFIRMED booking 4h before start (< 12h tier) -> 0% refund', () => {
    const result = cancelBooking(100, 'CUSTOMER', 8003, 'Hủy sát giờ');

    assert.strictEqual(result.status, 'CANCELLED');
    assert.strictEqual(result.cancelSource, 'CUSTOMER');
    assert.strictEqual(result.refundPercent, 0);
    assert.strictEqual(result.refundAmount, 0);
  });

  it('TC-CAN-05: Organizer cancels CONFIRMED booking -> 100% full refund to customer', () => {
    // Booking 8003 has only 4h remaining, but Organizer cancels due to building maintenance
    const result = cancelBooking(10, 'ORGANIZER', 8003, 'Sự cố rò rỉ nước tại khu vực bàn làm việc');

    assert.strictEqual(result.status, 'CANCELLED');
    assert.strictEqual(result.cancelSource, 'ORGANIZER');
    assert.strictEqual(result.refundPercent, 100);
    assert.strictEqual(result.refundAmount, 100000); // 100% of finalPrice
    assert.strictEqual(result.cancelReason, 'Sự cố rò rỉ nước tại khu vực bàn làm việc');
  });

  it('TC-CAN-06: State Guard - Cannot cancel COMPLETED booking', () => {
    assert.throws(
      () => cancelBooking(100, 'CUSTOMER', 8005, 'Thử hủy đơn đã hoàn thành'),
      {
        message: 'Cannot cancel booking in current status: COMPLETED'
      }
    );
  });

  it('TC-CAN-07: Multi-tenant Security - Customer Alice cannot cancel Customer Bob booking', () => {
    assert.throws(
      () => cancelBooking(100, 'CUSTOMER', 8006, 'Can thiệp đơn người khác'),
      {
        message: 'Booking not found or unauthorized'
      }
    );
  });

  it('TC-CAN-08: Cancellation Preview returns accurate policy calculation without mutating state', () => {
    const preview = getCancellationPreview(100, 'CUSTOMER', 8001);

    assert.strictEqual(preview.bookingId, 8001);
    assert.strictEqual(preview.canCancel, true);
    assert.strictEqual(preview.isHostCancellation, false);
    assert.strictEqual(preview.refundPercent, 100);
    assert.strictEqual(preview.refundAmount, 200000);
    assert.strictEqual(preview.rules.length, 3);

    // Verify booking state in DB remained CONFIRMED
    const booking = mockBookings.find((b) => b.id === 8001);
    assert.strictEqual(booking?.status, 'CONFIRMED');
  });

});
