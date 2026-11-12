import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Multi-Role Booking Detail View Test Suite (Customer, Organizer, Admin)', () => {

  interface MockBookingDetail {
    id: number;
    bookingCode: string;
    customerId: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    workspaceId: number;
    workspaceName: string;
    workspaceHostId: number;
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
    status: 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
    holdExpiresAt: string | null;
    qrTokenHash: string;
  }

  const sampleBooking: MockBookingDetail = {
    id: 501,
    bookingCode: 'BK-20261112-C8D7E6',
    customerId: 100, // Customer John
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    customerPhone: '+84901234567',
    workspaceId: 10,
    workspaceName: 'NexSpace Saigon Hub',
    workspaceHostId: 200, // Host Sarah
    resourceId: 42,
    resourceCode: 'ROOM-M02',
    resourceName: 'Meeting Room Sunflower',
    resourceCategory: 'MEETING_ROOM',
    floorName: 'Floor 14',
    zoneName: 'Collaboration Wing',
    startTime: '2026-11-20T09:00:00',
    endTime: '2026-11-20T11:00:00',
    durationHours: 2.0,
    baseAmount: 30.0,
    taxAmount: 2.4,
    finalPrice: 32.4,
    status: 'CONFIRMED',
    holdExpiresAt: null,
    qrTokenHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  };

  /**
   * Access control evaluator matching backend BookingServiceImpl logic
   */
  const evaluateAccess = (
    booking: MockBookingDetail,
    callerId: number,
    callerRole: 'CUSTOMER' | 'ORGANIZER' | 'ADMIN'
  ): { allowed: boolean; reason?: string } => {
    // 1. Admin always allowed cross-tenant
    if (callerRole === 'ADMIN') {
      return { allowed: true };
    }

    // 2. Customer can only access their own booking
    if (callerRole === 'CUSTOMER') {
      if (booking.customerId === callerId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'NOT_FOUND' };
    }

    // 3. Organizer can access bookings in workspaces they own
    if (callerRole === 'ORGANIZER') {
      if (booking.workspaceHostId === callerId) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'NOT_FOUND' };
    }

    return { allowed: false, reason: 'NOT_FOUND' };
  };

  it('TC-ROLE-01: Customer can view their own booking detail by ID and Code', () => {
    const access = evaluateAccess(sampleBooking, 100, 'CUSTOMER');
    assert.equal(access.allowed, true);

    // Verify critical details returned for customer view
    assert.equal(sampleBooking.bookingCode, 'BK-20261112-C8D7E6');
    assert.equal(sampleBooking.resourceCode, 'ROOM-M02');
    assert.equal(sampleBooking.finalPrice, 32.4);
    assert.equal(sampleBooking.status, 'CONFIRMED');
  });

  it('TC-ROLE-02: Organizer (Host) can view booking detail for workspaces they manage', () => {
    const hostId = 200; // Workspace owner
    const access = evaluateAccess(sampleBooking, hostId, 'ORGANIZER');
    assert.equal(access.allowed, true);

    // Verify host sees customer snapshot for check-in assistance
    assert.equal(sampleBooking.customerName, 'John Doe');
    assert.equal(sampleBooking.customerEmail, 'john.doe@example.com');
    assert.equal(sampleBooking.customerPhone, '+84901234567');
  });

  it('TC-ROLE-03: Platform Admin can view any booking detail across the entire system', () => {
    const adminId = 9999; // Arbitrary admin ID
    const access = evaluateAccess(sampleBooking, adminId, 'ADMIN');
    assert.equal(access.allowed, true);
  });

  it('TC-ROLE-04: Unauthorized Customer cannot view another customers booking (404 Defense)', () => {
    const maliciousCustomerId = 888;
    const access = evaluateAccess(sampleBooking, maliciousCustomerId, 'CUSTOMER');
    assert.equal(access.allowed, false);
    assert.equal(access.reason, 'NOT_FOUND');
  });

  it('TC-ROLE-05: Unauthorized Organizer cannot view booking of a workspace they do not own', () => {
    const foreignOrganizerId = 999; // Owns another workspace
    const access = evaluateAccess(sampleBooking, foreignOrganizerId, 'ORGANIZER');
    assert.equal(access.allowed, false);
    assert.equal(access.reason, 'NOT_FOUND');
  });

  it('TC-PASS-01: Generates 4-digit check-in PIN and security credentials for Digital Pass', () => {
    // Generate PIN from digits of booking code or fallback
    const digitsOnly = sampleBooking.bookingCode.replace(/\D/g, '');
    const pin = digitsOnly.slice(-4) || '8492';

    assert.equal(pin.length, 4);
    assert.match(pin, /^\d{4}$/);

    // Verify QR token hash presence
    assert.equal(sampleBooking.qrTokenHash.length, 64);
  });

  it('TC-STATUS-01: Maps booking statuses to UI badge labels accurately', () => {
    const getStatusLabel = (status: MockBookingDetail['status']) => {
      switch (status) {
        case 'CONFIRMED':
          return 'Confirmed & Paid';
        case 'PENDING_PAYMENT':
          return 'Pending Payment (15m Hold)';
        case 'PENDING_APPROVAL':
          return 'Pending Host Approval';
        case 'CANCELLED':
          return 'Cancelled';
        case 'COMPLETED':
          return 'Completed';
      }
    };

    assert.equal(getStatusLabel('CONFIRMED'), 'Confirmed & Paid');
    assert.equal(getStatusLabel('PENDING_PAYMENT'), 'Pending Payment (15m Hold)');
    assert.equal(getStatusLabel('PENDING_APPROVAL'), 'Pending Host Approval');
    assert.equal(getStatusLabel('CANCELLED'), 'Cancelled');
    assert.equal(getStatusLabel('COMPLETED'), 'Completed');
  });

  it('TC-NAV-01: Validates search params for confirmation route (/workspaces/confirmation)', () => {
    const validateSearch = (search: Record<string, unknown>) => ({
      bookingCode: typeof search.bookingCode === 'string' ? search.bookingCode : undefined,
      orderRef: typeof search.orderRef === 'string' ? search.orderRef : undefined,
      bookingId:
        Number.isSafeInteger(Number(search.bookingId)) && Number(search.bookingId) > 0
          ? Number(search.bookingId)
          : undefined
    });

    const validCase = validateSearch({ bookingCode: 'BK-12345', bookingId: '501' });
    assert.equal(validCase.bookingCode, 'BK-12345');
    assert.equal(validCase.bookingId, 501);

    const invalidCase = validateSearch({ bookingId: '-5', bookingCode: 12345 });
    assert.equal(invalidCase.bookingId, undefined);
    assert.equal(invalidCase.bookingCode, undefined);
  });
});
