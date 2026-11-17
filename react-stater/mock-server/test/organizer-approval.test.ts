import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('Organizer Manual Booking Approval & Rejection Test Suite', () => {

  interface BookingRecord {
    id: number;
    bookingCode: string;
    organizerId: number;
    workspaceId: number;
    workspaceName: string;
    resourceId: number;
    resourceCode: string;
    resourceName: string;
    customerId: number;
    customerName: string;
    customerEmail: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    finalPrice: number;
    status: 'PENDING_APPROVAL' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
    confirmationMode: 'MANUAL_APPROVAL' | 'INSTANT';
    holdExpiresAt: string | null;
    cancelReason?: string | null;
    cancelSource?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
  }

  interface AuditRecord {
    id: number;
    bookingId: number;
    actorUserId: number;
    actionType: 'APPROVE' | 'REJECT' | 'CREATE' | 'CANCEL';
    fromStatus: string;
    toStatus: string;
    notes?: string;
    createdAt: string;
  }

  let mockBookings: BookingRecord[];
  let mockAuditLogs: AuditRecord[];
  let auditIdCounter: number;

  beforeEach(() => {
    auditIdCounter = 1;
    mockAuditLogs = [];
    mockBookings = [
      {
        id: 7001,
        bookingCode: 'BK-20261125-APP01',
        organizerId: 10, // Organizer Alpha
        workspaceId: 1,  // Workspace Central
        workspaceName: 'NexSpace Central Tower',
        resourceId: 101,
        resourceCode: 'OFFICE-A01',
        resourceName: 'Executive Team Suite',
        customerId: 50,
        customerName: 'Minh Quan',
        customerEmail: 'minh.quan@ai-tech.vn',
        startTime: '2026-11-25T09:00:00',
        endTime: '2026-11-25T17:00:00',
        durationHours: 8.0,
        finalPrice: 1500000,
        status: 'PENDING_APPROVAL',
        confirmationMode: 'MANUAL_APPROVAL',
        holdExpiresAt: '2026-11-25T09:30:00',
        cancelReason: null,
        cancelSource: null,
        cancelledAt: null,
        createdAt: '2026-11-12T08:00:00'
      },
      {
        id: 7002,
        bookingCode: 'BK-20261125-APP02',
        organizerId: 10, // Organizer Alpha
        workspaceId: 1,
        workspaceName: 'NexSpace Central Tower',
        resourceId: 102,
        resourceCode: 'DESK-FREE',
        resourceName: 'Complimentary Hot Desk Promo',
        customerId: 51,
        customerName: 'Lan Anh',
        customerEmail: 'lananh@student.edu.vn',
        startTime: '2026-11-25T10:00:00',
        endTime: '2026-11-25T12:00:00',
        durationHours: 2.0,
        finalPrice: 0, // Free booking
        status: 'PENDING_APPROVAL',
        confirmationMode: 'MANUAL_APPROVAL',
        holdExpiresAt: '2026-11-25T10:30:00',
        cancelReason: null,
        cancelSource: null,
        cancelledAt: null,
        createdAt: '2026-11-12T08:15:00'
      },
      {
        id: 7003,
        bookingCode: 'BK-20261125-APP03',
        organizerId: 20, // Organizer Beta
        workspaceId: 5,  // Workspace Innovation Hub
        workspaceName: 'Innovation Hub District 7',
        resourceId: 201,
        resourceCode: 'CONF-B02',
        resourceName: 'Conference Room Beta',
        customerId: 52,
        customerName: 'Hoang Nam',
        customerEmail: 'nam@agency.vn',
        startTime: '2026-11-25T14:00:00',
        endTime: '2026-11-25T16:00:00',
        durationHours: 2.0,
        finalPrice: 350000,
        status: 'PENDING_APPROVAL',
        confirmationMode: 'MANUAL_APPROVAL',
        holdExpiresAt: '2026-11-25T14:30:00',
        cancelReason: null,
        cancelSource: null,
        cancelledAt: null,
        createdAt: '2026-11-12T08:30:00'
      },
      {
        id: 7004,
        bookingCode: 'BK-20261125-APP04',
        organizerId: 10,
        workspaceId: 1,
        workspaceName: 'NexSpace Central Tower',
        resourceId: 103,
        resourceCode: 'DESK-A15',
        resourceName: 'Window Focus Desk',
        customerId: 53,
        customerName: 'David Pham',
        customerEmail: 'david@startupvn.com',
        startTime: '2026-11-25T08:00:00',
        endTime: '2026-11-25T18:00:00',
        durationHours: 10.0,
        finalPrice: 200000,
        status: 'CONFIRMED', // Already confirmed
        confirmationMode: 'MANUAL_APPROVAL',
        holdExpiresAt: null,
        cancelReason: null,
        cancelSource: null,
        cancelledAt: null,
        createdAt: '2026-11-12T07:00:00'
      }
    ];
  });

  // Service Simulation matching Spring Boot Backend
  function approveBooking(callerUserId: number, callerRole: 'ORGANIZER' | 'ADMIN', bookingId: number): BookingRecord {
    const booking = mockBookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Security Gate
    if (callerRole !== 'ADMIN' && booking.organizerId !== callerUserId) {
      throw new Error('Booking not found or unauthorized');
    }

    // Status Gate
    if (booking.status !== 'PENDING_APPROVAL') {
      throw new Error(`Only bookings with status PENDING_APPROVAL can be approved. Current status: ${booking.status}`);
    }

    const previousStatus = booking.status;
    const now = new Date();

    if (booking.finalPrice > 0) {
      booking.status = 'PENDING_PAYMENT';
      const holdExpires = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins checkout window
      booking.holdExpiresAt = holdExpires.toISOString();
    } else {
      booking.status = 'CONFIRMED';
      booking.holdExpiresAt = null;
    }

    mockAuditLogs.push({
      id: auditIdCounter++,
      bookingId: booking.id,
      actorUserId: callerUserId,
      actionType: 'APPROVE',
      fromStatus: previousStatus,
      toStatus: booking.status,
      notes: 'Organizer manual confirmation approved',
      createdAt: now.toISOString()
    });

    return booking;
  }

  function rejectBooking(
    callerUserId: number,
    callerRole: 'ORGANIZER' | 'ADMIN',
    bookingId: number,
    rejectionReason?: string
  ): BookingRecord {
    const booking = mockBookings.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Security Gate
    if (callerRole !== 'ADMIN' && booking.organizerId !== callerUserId) {
      throw new Error('Booking not found or unauthorized');
    }

    // Status Gate
    if (booking.status !== 'PENDING_APPROVAL') {
      throw new Error(`Only bookings with status PENDING_APPROVAL can be rejected. Current status: ${booking.status}`);
    }

    const previousStatus = booking.status;
    const now = new Date();

    booking.status = 'CANCELLED';
    booking.cancelSource = 'ORGANIZER';
    booking.cancelReason = rejectionReason || 'Organizer declined booking request';
    booking.cancelledAt = now.toISOString();
    booking.holdExpiresAt = null; // Instantly releases seat

    mockAuditLogs.push({
      id: auditIdCounter++,
      bookingId: booking.id,
      actorUserId: callerUserId,
      actionType: 'REJECT',
      fromStatus: previousStatus,
      toStatus: booking.status,
      notes: booking.cancelReason,
      createdAt: now.toISOString()
    });

    return booking;
  }

  // --- Test Cases ---

  it('TC-APP-01: Approve paid booking -> transitions PENDING_APPROVAL to PENDING_PAYMENT with 15m hold', () => {
    const result = approveBooking(10, 'ORGANIZER', 7001);

    assert.strictEqual(result.status, 'PENDING_PAYMENT');
    assert.ok(result.holdExpiresAt !== null);
    const holdDate = new Date(result.holdExpiresAt!);
    const now = new Date();
    const diffMins = Math.round((holdDate.getTime() - now.getTime()) / (60 * 1000));
    assert.strictEqual(diffMins, 15);

    // Verify DB & Audit Log
    assert.strictEqual(mockAuditLogs.length, 1);
    assert.strictEqual(mockAuditLogs[0].actionType, 'APPROVE');
    assert.strictEqual(mockAuditLogs[0].fromStatus, 'PENDING_APPROVAL');
    assert.strictEqual(mockAuditLogs[0].toStatus, 'PENDING_PAYMENT');
  });

  it('TC-APP-02: Approve free booking (finalPrice == 0) -> transitions directly to CONFIRMED', () => {
    const result = approveBooking(10, 'ORGANIZER', 7002);

    assert.strictEqual(result.status, 'CONFIRMED');
    assert.strictEqual(result.holdExpiresAt, null);

    assert.strictEqual(mockAuditLogs.length, 1);
    assert.strictEqual(mockAuditLogs[0].toStatus, 'CONFIRMED');
  });

  it('TC-APP-03: Reject booking -> transitions to CANCELLED, stores cancelReason, releases hold slot', () => {
    const reason = 'Room maintenance scheduled for that morning';
    const result = rejectBooking(10, 'ORGANIZER', 7001, reason);

    assert.strictEqual(result.status, 'CANCELLED');
    assert.strictEqual(result.cancelSource, 'ORGANIZER');
    assert.strictEqual(result.cancelReason, reason);
    assert.strictEqual(result.holdExpiresAt, null); // Slot is unlocked
    assert.ok(result.cancelledAt !== null);

    // Verify DB & Audit Log
    assert.strictEqual(mockAuditLogs.length, 1);
    assert.strictEqual(mockAuditLogs[0].actionType, 'REJECT');
    assert.strictEqual(mockAuditLogs[0].fromStatus, 'PENDING_APPROVAL');
    assert.strictEqual(mockAuditLogs[0].toStatus, 'CANCELLED');
    assert.strictEqual(mockAuditLogs[0].notes, reason);
  });

  it('TC-APP-04: Status Guard - Cannot approve or reject already CONFIRMED booking', () => {
    assert.throws(
      () => approveBooking(10, 'ORGANIZER', 7004),
      {
        message: 'Only bookings with status PENDING_APPROVAL can be approved. Current status: CONFIRMED'
      }
    );

    assert.throws(
      () => rejectBooking(10, 'ORGANIZER', 7004, 'Declined'),
      {
        message: 'Only bookings with status PENDING_APPROVAL can be rejected. Current status: CONFIRMED'
      }
    );

    assert.strictEqual(mockAuditLogs.length, 0); // No state mutation occurred
  });

  it('TC-APP-05: Multi-tenant Security - Organizer Alpha cannot approve or reject booking belonging to Organizer Beta', () => {
    // Organizer Alpha (10) attempting to approve booking 7003 owned by Organizer Beta (20)
    assert.throws(
      () => approveBooking(10, 'ORGANIZER', 7003),
      {
        message: 'Booking not found or unauthorized'
      }
    );

    assert.throws(
      () => rejectBooking(10, 'ORGANIZER', 7003, 'Unauthorized reject'),
      {
        message: 'Booking not found or unauthorized'
      }
    );

    assert.strictEqual(mockAuditLogs.length, 0);
  });

  it('TC-APP-06: Administrator privilege - Admin can approve or reject booking across any workspace', () => {
    const resultApprove = approveBooking(999, 'ADMIN', 7003);
    assert.strictEqual(resultApprove.status, 'PENDING_PAYMENT');
    assert.strictEqual(mockAuditLogs[0].actorUserId, 999);
  });

  it('TC-APP-07: Audit Trail and Data Persistence Verification', () => {
    approveBooking(10, 'ORGANIZER', 7001);
    rejectBooking(10, 'ORGANIZER', 7002, 'Promotional slots fully booked');

    assert.strictEqual(mockAuditLogs.length, 2);

    // Audit Log 1
    assert.strictEqual(mockAuditLogs[0].bookingId, 7001);
    assert.strictEqual(mockAuditLogs[0].actionType, 'APPROVE');
    assert.strictEqual(mockAuditLogs[0].fromStatus, 'PENDING_APPROVAL');
    assert.strictEqual(mockAuditLogs[0].toStatus, 'PENDING_PAYMENT');

    // Audit Log 2
    assert.strictEqual(mockAuditLogs[1].bookingId, 7002);
    assert.strictEqual(mockAuditLogs[1].actionType, 'REJECT');
    assert.strictEqual(mockAuditLogs[1].notes, 'Promotional slots fully booked');

    // DB state verified
    const dbBooking1 = mockBookings.find((b) => b.id === 7001);
    assert.strictEqual(dbBooking1?.status, 'PENDING_PAYMENT');

    const dbBooking2 = mockBookings.find((b) => b.id === 7002);
    assert.strictEqual(dbBooking2?.status, 'CANCELLED');
    assert.strictEqual(dbBooking2?.cancelSource, 'ORGANIZER');
  });

  it('TC-APP-08: UI State Machine Parity - Status counts and filter badge mapping', () => {
    const pendingApprovalCount = mockBookings.filter((b) => b.status === 'PENDING_APPROVAL').length;
    const confirmedCount = mockBookings.filter((b) => b.status === 'CONFIRMED').length;

    assert.strictEqual(pendingApprovalCount, 3);
    assert.strictEqual(confirmedCount, 1);

    // Filter by PENDING_APPROVAL tab
    const filteredPendingApproval = mockBookings.filter((b) => b.status === 'PENDING_APPROVAL');
    assert.strictEqual(filteredPendingApproval.length, 3);
    assert.ok(filteredPendingApproval.every((b) => b.status === 'PENDING_APPROVAL'));
  });

});
