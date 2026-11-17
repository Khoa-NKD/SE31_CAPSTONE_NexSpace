import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Customer Booking History Comprehensive Test Suite', () => {

  interface BookingRecord {
    id: number;
    bookingCode: string;
    customerId: number;
    customerName: string;
    workspaceId: number;
    workspaceName: string;
    workspaceAddress: string;
    resourceId: number;
    resourceCode: string;
    resourceName: string;
    resourceCategory: 'DESK' | 'MEETING_ROOM' | 'PRIVATE_OFFICE';
    floorName: string;
    zoneName: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    baseAmount: number;
    taxAmount: number;
    finalPrice: number;
    status: 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
    holdExpiresAt: string | null;
    qrTokenHash: string | null;
    createdAt: string;
  }

  // In-memory mock database of bookings
  const mockDatabase: BookingRecord[] = [
    {
      id: 1001,
      bookingCode: 'BK-20261125-CONF1',
      customerId: 50, // Customer Alice
      customerName: 'Alice Nguyen',
      workspaceId: 1,
      workspaceName: 'NexSpace Central Tower',
      workspaceAddress: '72 Le Thanh Ton, District 1, HCMC',
      resourceId: 101,
      resourceCode: 'DESK-A12',
      resourceName: 'Dedicated Desk A12',
      resourceCategory: 'DESK',
      floorName: 'Floor 12',
      zoneName: 'Silent Focus Zone',
      startTime: '2026-11-25T09:00:00',
      endTime: '2026-11-25T17:00:00',
      durationHours: 8.0,
      baseAmount: 200000,
      taxAmount: 16000,
      finalPrice: 216000,
      status: 'CONFIRMED',
      holdExpiresAt: null,
      qrTokenHash: 'qr_hash_alice_1001',
      createdAt: '2026-11-12T05:00:00'
    },
    {
      id: 1002,
      bookingCode: 'BK-20261126-PEND1',
      customerId: 50, // Customer Alice
      customerName: 'Alice Nguyen',
      workspaceId: 1,
      workspaceName: 'NexSpace Central Tower',
      workspaceAddress: '72 Le Thanh Ton, District 1, HCMC',
      resourceId: 102,
      resourceCode: 'ROOM-M01',
      resourceName: 'Meeting Room Alpha',
      resourceCategory: 'MEETING_ROOM',
      floorName: 'Floor 12',
      zoneName: 'Meeting Suite',
      startTime: '2026-11-26T14:00:00',
      endTime: '2026-11-26T16:00:00',
      durationHours: 2.0,
      baseAmount: 300000,
      taxAmount: 24000,
      finalPrice: 324000,
      status: 'PENDING_PAYMENT',
      holdExpiresAt: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
      qrTokenHash: null,
      createdAt: '2026-11-12T06:00:00'
    },
    {
      id: 1003,
      bookingCode: 'BK-20261110-COMP1',
      customerId: 50, // Customer Alice
      customerName: 'Alice Nguyen',
      workspaceId: 2,
      workspaceName: 'NexSpace Saigon Hub',
      workspaceAddress: '15 Le Duan, District 1, HCMC',
      resourceId: 201,
      resourceCode: 'DESK-B04',
      resourceName: 'Flex Desk B04',
      resourceCategory: 'DESK',
      floorName: 'Floor 8',
      zoneName: 'Creative Lounge',
      startTime: '2026-11-10T08:00:00',
      endTime: '2026-11-10T12:00:00',
      durationHours: 4.0,
      baseAmount: 120000,
      taxAmount: 9600,
      finalPrice: 129600,
      status: 'COMPLETED',
      holdExpiresAt: null,
      qrTokenHash: 'qr_hash_alice_1003',
      createdAt: '2026-11-09T10:00:00'
    },
    {
      id: 1004,
      bookingCode: 'BK-20261108-CANC1',
      customerId: 50, // Customer Alice
      customerName: 'Alice Nguyen',
      workspaceId: 1,
      workspaceName: 'NexSpace Central Tower',
      workspaceAddress: '72 Le Thanh Ton, District 1, HCMC',
      resourceId: 103,
      resourceCode: 'OFFICE-C01',
      resourceName: 'Executive Suite C01',
      resourceCategory: 'PRIVATE_OFFICE',
      floorName: 'Floor 14',
      zoneName: 'Private Wing',
      startTime: '2026-11-08T09:00:00',
      endTime: '2026-11-08T18:00:00',
      durationHours: 9.0,
      baseAmount: 1500000,
      taxAmount: 120000,
      finalPrice: 1620000,
      status: 'CANCELLED',
      holdExpiresAt: null,
      qrTokenHash: null,
      createdAt: '2026-11-07T08:00:00'
    },
    {
      id: 2001,
      bookingCode: 'BK-20261120-BOB01',
      customerId: 99, // Customer Bob (Another user)
      customerName: 'Bob Tran',
      workspaceId: 1,
      workspaceName: 'NexSpace Central Tower',
      workspaceAddress: '72 Le Thanh Ton, District 1, HCMC',
      resourceId: 105,
      resourceCode: 'DESK-A05',
      resourceName: 'Dedicated Desk A05',
      resourceCategory: 'DESK',
      floorName: 'Floor 12',
      zoneName: 'Silent Focus Zone',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T17:00:00',
      durationHours: 8.0,
      baseAmount: 200000,
      taxAmount: 16000,
      finalPrice: 216000,
      status: 'CONFIRMED',
      holdExpiresAt: null,
      qrTokenHash: 'qr_hash_bob_2001',
      createdAt: '2026-11-10T12:00:00'
    }
  ];

  // Simulated backend query service
  function queryCustomerBookings(
    customerId: number,
    statusFilter?: string,
    page = 1,
    size = 10
  ) {
    // 1. Strict Ownership Filter
    let filtered = mockDatabase.filter((b) => b.customerId === customerId);

    // 2. Status Filter
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    // 3. Sort by createdAt DESC
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 4. Pagination calculation
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size) || 1;
    const startIndex = (page - 1) * size;
    const content = filtered.slice(startIndex, startIndex + size);

    return {
      content,
      totalElements,
      totalPages,
      page,
      size
    };
  }

  // Simulated cancellation service
  function cancelBookingHold(customerId: number, bookingId: number, reason?: string) {
    const booking = mockDatabase.find((b) => b.id === bookingId);
    if (!booking) {
      throw new Error('404: Booking not found');
    }
    if (booking.customerId !== customerId) {
      throw new Error('403: Forbidden - not booking owner');
    }
    if (booking.status !== 'PENDING_PAYMENT') {
      throw new Error(`400: Cannot cancel booking in status ${booking.status}`);
    }

    // Update in-memory DB (DB Persistence check)
    booking.status = 'CANCELLED';
    booking.holdExpiresAt = null;

    return {
      success: true,
      data: booking,
      message: `Đơn đặt chỗ đã được hủy thành công. Lý do: ${reason || 'Khách yêu cầu'}`
    };
  }

  it('TC-HIST-01: Customer Alice retrieves all bookings with pagination and sort order', () => {
    const response = queryCustomerBookings(50, undefined, 1, 10);

    assert.equal(response.totalElements, 4, 'Alice should have exactly 4 bookings');
    assert.equal(response.content.length, 4);
    assert.equal(response.page, 1);
    assert.equal(response.totalPages, 1);

    // Verify ordering: Newest first (1002 created at 06:00, then 1001 created at 05:00)
    assert.equal(response.content[0].id, 1002);
    assert.equal(response.content[1].id, 1001);
    assert.equal(response.content[2].id, 1003);
    assert.equal(response.content[3].id, 1004);
  });

  it('TC-HIST-02: Filter Alice bookings by status CONFIRMED', () => {
    const response = queryCustomerBookings(50, 'CONFIRMED');

    assert.equal(response.totalElements, 1);
    assert.equal(response.content[0].bookingCode, 'BK-20261125-CONF1');
    assert.equal(response.content[0].status, 'CONFIRMED');
    assert.ok(response.content[0].qrTokenHash, 'Confirmed booking must have digital QR token hash');
  });

  it('TC-HIST-03: Filter Alice bookings by status PENDING_PAYMENT (Active Hold)', () => {
    const response = queryCustomerBookings(50, 'PENDING_PAYMENT');

    assert.equal(response.totalElements, 1);
    const holdBooking = response.content[0];
    assert.equal(holdBooking.bookingCode, 'BK-20261126-PEND1');
    assert.equal(holdBooking.status, 'PENDING_PAYMENT');
    assert.ok(holdBooking.holdExpiresAt, 'Pending hold booking must have holdExpiresAt timestamp');

    const remainingMs = new Date(holdBooking.holdExpiresAt!).getTime() - Date.now();
    assert.ok(remainingMs > 0, 'Hold timestamp must be in the future');
  });

  it('TC-HIST-04: Filter Alice bookings by status COMPLETED and CANCELLED', () => {
    const completedRes = queryCustomerBookings(50, 'COMPLETED');
    assert.equal(completedRes.totalElements, 1);
    assert.equal(completedRes.content[0].id, 1003);

    const cancelledRes = queryCustomerBookings(50, 'CANCELLED');
    assert.equal(cancelledRes.totalElements, 1);
    assert.equal(cancelledRes.content[0].id, 1004);
  });

  it('TC-HIST-05: Strict Tenant Isolation - Alice cannot see Bob bookings', () => {
    const aliceBookings = queryCustomerBookings(50);
    const hasBobBooking = aliceBookings.content.some((b) => b.customerId === 99 || b.id === 2001);
    assert.equal(hasBobBooking, false, 'Security gate: Customer Alice must never see Bob bookings');

    const bobBookings = queryCustomerBookings(99);
    assert.equal(bobBookings.totalElements, 1);
    assert.equal(bobBookings.content[0].id, 2001);
  });

  it('TC-HIST-06: Pagination slices data accurately', () => {
    // Page 1 with size 2
    const page1 = queryCustomerBookings(50, 'ALL', 1, 2);
    assert.equal(page1.totalElements, 4);
    assert.equal(page1.totalPages, 2);
    assert.equal(page1.content.length, 2);
    assert.equal(page1.content[0].id, 1002);
    assert.equal(page1.content[1].id, 1001);

    // Page 2 with size 2
    const page2 = queryCustomerBookings(50, 'ALL', 2, 2);
    assert.equal(page2.content.length, 2);
    assert.equal(page2.content[0].id, 1003);
    assert.equal(page2.content[1].id, 1004);
  });

  it('TC-HIST-07: Cancel Hold updates status to CANCELLED and clears hold lock', () => {
    const cancelResult = cancelBookingHold(50, 1002, 'Customer changed meeting schedule');

    assert.equal(cancelResult.success, true);
    assert.equal(cancelResult.data.status, 'CANCELLED');
    assert.equal(cancelResult.data.holdExpiresAt, null, 'Hold timestamp must be cleared on cancellation');

    // Verify DB persistence: Querying again shows updated status
    const refreshed = queryCustomerBookings(50, 'CANCELLED');
    assert.equal(refreshed.totalElements, 2, 'Should now have 2 cancelled bookings');
    const justCancelled = refreshed.content.find((b) => b.id === 1002);
    assert.ok(justCancelled, 'Cancelled booking 1002 must persist in database query');
    assert.equal(justCancelled?.status, 'CANCELLED');
  });

  it('TC-HIST-08: Security Gate - Alice cannot cancel Bob booking', () => {
    assert.throws(
      () => cancelBookingHold(50, 2001, 'Unauthorized cancel attempt'),
      /403: Forbidden - not booking owner/
    );
  });

  it('TC-HIST-09: Financial Precision - Prices and taxes are calculated without floating point distortion', () => {
    const aliceBookings = queryCustomerBookings(50);
    for (const b of aliceBookings.content) {
      assert.ok(b.baseAmount > 0);
      assert.ok(b.finalPrice >= b.baseAmount);
      assert.equal(b.finalPrice, b.baseAmount + b.taxAmount, 'Final price must equal base amount + tax');
    }
  });

  it('TC-HIST-10: Empty State test - User with 0 bookings returns empty content array gracefully', () => {
    const newCustomerRes = queryCustomerBookings(999);
    assert.equal(newCustomerRes.totalElements, 0);
    assert.equal(newCustomerRes.content.length, 0);
    assert.equal(newCustomerRes.totalPages, 1);
  });
});
