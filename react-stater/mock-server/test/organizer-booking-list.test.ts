import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Organizer Booking List Comprehensive Test Suite', () => {

  interface BookingRecord {
    id: number;
    bookingCode: string;
    organizerId: number;
    workspaceId: number;
    workspaceName: string;
    resourceId: number;
    resourceCode: string;
    resourceName: string;
    resourceCategory: 'DESK' | 'MEETING_ROOM' | 'PRIVATE_OFFICE';
    customerId: number;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    customerPhone: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    baseAmount: number;
    taxAmount: number;
    finalPrice: number;
    status: 'PENDING_PAYMENT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
    createdAt: string;
  }

  // Realistic Database seed
  const mockDatabase: BookingRecord[] = [
    {
      id: 5001,
      bookingCode: 'BK-20261125-ORG01',
      organizerId: 10, // Organizer Alpha
      workspaceId: 1, // Workspace Central Tower
      workspaceName: 'NexSpace Central Tower',
      resourceId: 101,
      resourceCode: 'DESK-A12',
      resourceName: 'Dedicated Desk A12',
      resourceCategory: 'DESK',
      customerId: 50,
      customerFirstName: 'Alice',
      customerLastName: 'Nguyen',
      customerEmail: 'alice@nexspace.vn',
      customerPhone: '+84901234567',
      startTime: '2026-11-25T09:00:00',
      endTime: '2026-11-25T17:00:00',
      durationHours: 8.0,
      baseAmount: 200000,
      taxAmount: 16000,
      finalPrice: 216000,
      status: 'CONFIRMED',
      createdAt: '2026-11-12T05:00:00'
    },
    {
      id: 5002,
      bookingCode: 'BK-20261125-ORG02',
      organizerId: 10, // Organizer Alpha
      workspaceId: 1, // Workspace Central Tower
      workspaceName: 'NexSpace Central Tower',
      resourceId: 102,
      resourceCode: 'ROOM-M01',
      resourceName: 'Meeting Room Alpha',
      resourceCategory: 'MEETING_ROOM',
      customerId: 51,
      customerFirstName: 'Charlie',
      customerLastName: 'Vu',
      customerEmail: 'charlie.vu@gmail.com',
      customerPhone: '+84912345678',
      startTime: '2026-11-25T14:00:00',
      endTime: '2026-11-25T16:00:00',
      durationHours: 2.0,
      baseAmount: 300000,
      taxAmount: 24000,
      finalPrice: 324000,
      status: 'PENDING_PAYMENT',
      createdAt: '2026-11-12T06:00:00'
    },
    {
      id: 5003,
      bookingCode: 'BK-20261110-ORG03',
      organizerId: 10, // Organizer Alpha
      workspaceId: 2, // Workspace Saigon Hub
      workspaceName: 'NexSpace Saigon Hub',
      resourceId: 201,
      resourceCode: 'DESK-B04',
      resourceName: 'Flex Desk B04',
      resourceCategory: 'DESK',
      customerId: 50,
      customerFirstName: 'Alice',
      customerLastName: 'Nguyen',
      customerEmail: 'alice@nexspace.vn',
      customerPhone: '+84901234567',
      startTime: '2026-11-10T08:00:00',
      endTime: '2026-11-10T12:00:00',
      durationHours: 4.0,
      baseAmount: 120000,
      taxAmount: 9600,
      finalPrice: 129600,
      status: 'COMPLETED',
      createdAt: '2026-11-09T10:00:00'
    },
    {
      id: 5004,
      bookingCode: 'BK-20261108-ORG04',
      organizerId: 10, // Organizer Alpha
      workspaceId: 1, // Workspace Central Tower
      workspaceName: 'NexSpace Central Tower',
      resourceId: 103,
      resourceCode: 'OFFICE-C01',
      resourceName: 'Executive Suite C01',
      resourceCategory: 'PRIVATE_OFFICE',
      customerId: 52,
      customerFirstName: 'David',
      customerLastName: 'Pham',
      customerEmail: 'david.p@innovate.co',
      customerPhone: '+84988776655',
      startTime: '2026-11-08T09:00:00',
      endTime: '2026-11-08T18:00:00',
      durationHours: 9.0,
      baseAmount: 1500000,
      taxAmount: 120000,
      finalPrice: 1620000,
      status: 'CANCELLED',
      createdAt: '2026-11-07T08:00:00'
    },
    {
      id: 5005,
      bookingCode: 'BK-20261128-BETA01',
      organizerId: 99, // Organizer Beta (DIFFERENT ORGANIZER)
      workspaceId: 5, // Workspace owned by Beta
      workspaceName: 'Beta Coworking Space',
      resourceId: 501,
      resourceCode: 'DESK-X01',
      resourceName: 'Hot Desk X01',
      resourceCategory: 'DESK',
      customerId: 60,
      customerFirstName: 'Eva',
      customerLastName: 'Hoang',
      customerEmail: 'eva@corp.com',
      customerPhone: '+84933221100',
      startTime: '2026-11-28T10:00:00',
      endTime: '2026-11-28T14:00:00',
      durationHours: 4.0,
      baseAmount: 160000,
      taxAmount: 12800,
      finalPrice: 172800,
      status: 'CONFIRMED',
      createdAt: '2026-11-12T07:00:00'
    }
  ];

  // Mock Service query logic matching Spring Boot JPQL findOrganizerBookings
  function queryOrganizerBookings(
    currentUserId: number,
    currentUserRole: 'ORGANIZER' | 'ADMIN',
    filters: {
      workspaceId?: number;
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      search?: string;
      page?: number;
      size?: number;
    }
  ) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const size = filters.size && filters.size > 0 ? filters.size : 10;

    let items = mockDatabase.slice();

    // 1. Role-based isolation & Ownership check
    if (currentUserRole === 'ORGANIZER') {
      items = items.filter((b) => b.organizerId === currentUserId);

      // If workspaceId specified, ensure it belongs to this organizer
      if (filters.workspaceId) {
        const workspaceExistsForOrg = mockDatabase.some(
          (b) => b.workspaceId === filters.workspaceId && b.organizerId === currentUserId
        );
        if (!workspaceExistsForOrg) {
          throw new Error('Workspace not found or unauthorized');
        }
        items = items.filter((b) => b.workspaceId === filters.workspaceId);
      }
    } else if (currentUserRole === 'ADMIN') {
      if (filters.workspaceId) {
        items = items.filter((b) => b.workspaceId === filters.workspaceId);
      }
    }

    // 2. Status filter
    if (filters.status && filters.status !== 'ALL') {
      items = items.filter((b) => b.status === filters.status);
    }

    // 3. Date filtering
    if (filters.date) {
      const targetDate = filters.date.slice(0, 10);
      items = items.filter((b) => b.startTime.slice(0, 10) === targetDate);
    } else {
      if (filters.startDate) {
        items = items.filter((b) => b.startTime.slice(0, 10) >= filters.startDate!);
      }
      if (filters.endDate) {
        items = items.filter((b) => b.startTime.slice(0, 10) <= filters.endDate!);
      }
    }

    // 4. Keyword search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      items = items.filter((b) => {
        const fullName = `${b.customerFirstName} ${b.customerLastName}`.toLowerCase();
        return (
          b.bookingCode.toLowerCase().includes(q) ||
          fullName.includes(q) ||
          b.customerEmail.toLowerCase().includes(q) ||
          b.resourceCode.toLowerCase().includes(q) ||
          b.resourceName.toLowerCase().includes(q)
        );
      });
    }

    // Sort by createdAt DESC
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 5. Pagination
    const totalElements = items.length;
    const totalPages = Math.ceil(totalElements / size) || 1;
    const startIndex = (page - 1) * size;
    const content = items.slice(startIndex, startIndex + size);

    return {
      content,
      totalElements,
      totalPages,
      page,
      size,
      first: page === 1,
      last: page >= totalPages
    };
  }

  // TEST CASES

  it('TC-ORG-01: Organizer retrieves all bookings across owned workspaces by default', () => {
    const res = queryOrganizerBookings(10, 'ORGANIZER', {});
    assert.strictEqual(res.totalElements, 4);
    assert.strictEqual(res.content.length, 4);
    assert.ok(res.content.every((b) => b.organizerId === 10));
    assert.ok(!res.content.some((b) => b.bookingCode === 'BK-20261128-BETA01'));
  });

  it('TC-ORG-02: Filter bookings by specific Workspace (Workspace 1 vs Workspace 2)', () => {
    const resWs1 = queryOrganizerBookings(10, 'ORGANIZER', { workspaceId: 1 });
    assert.strictEqual(resWs1.totalElements, 3);
    assert.ok(resWs1.content.every((b) => b.workspaceId === 1));

    const resWs2 = queryOrganizerBookings(10, 'ORGANIZER', { workspaceId: 2 });
    assert.strictEqual(resWs2.totalElements, 1);
    assert.strictEqual(resWs2.content[0].bookingCode, 'BK-20261110-ORG03');
  });

  it('TC-ORG-03: Filter bookings by exact Date (e.g. 2026-11-25)', () => {
    const res = queryOrganizerBookings(10, 'ORGANIZER', { date: '2026-11-25' });
    assert.strictEqual(res.totalElements, 2);
    assert.ok(res.content.every((b) => b.startTime.startsWith('2026-11-25')));
    assert.ok(res.content.some((b) => b.bookingCode === 'BK-20261125-ORG01'));
    assert.ok(res.content.some((b) => b.bookingCode === 'BK-20261125-ORG02'));
  });

  it('TC-ORG-04: Filter bookings by Date Range (startDate and endDate)', () => {
    const res = queryOrganizerBookings(10, 'ORGANIZER', {
      startDate: '2026-11-01',
      endDate: '2026-11-15'
    });
    assert.strictEqual(res.totalElements, 2); // 5003 (2026-11-10) and 5004 (2026-11-08)
    assert.ok(res.content.some((b) => b.bookingCode === 'BK-20261110-ORG03'));
    assert.ok(res.content.some((b) => b.bookingCode === 'BK-20261108-ORG04'));
  });

  it('TC-ORG-05: Filter bookings by Status (CONFIRMED, PENDING_PAYMENT, COMPLETED, CANCELLED)', () => {
    const resConfirmed = queryOrganizerBookings(10, 'ORGANIZER', { status: 'CONFIRMED' });
    assert.strictEqual(resConfirmed.totalElements, 1);
    assert.strictEqual(resConfirmed.content[0].bookingCode, 'BK-20261125-ORG01');

    const resPending = queryOrganizerBookings(10, 'ORGANIZER', { status: 'PENDING_PAYMENT' });
    assert.strictEqual(resPending.totalElements, 1);
    assert.strictEqual(resPending.content[0].bookingCode, 'BK-20261125-ORG02');

    const resCancelled = queryOrganizerBookings(10, 'ORGANIZER', { status: 'CANCELLED' });
    assert.strictEqual(resCancelled.totalElements, 1);
    assert.strictEqual(resCancelled.content[0].bookingCode, 'BK-20261108-ORG04');
  });

  it('TC-ORG-06: Combined Multi-dimensional Filtering (Workspace + Date + Status)', () => {
    const res = queryOrganizerBookings(10, 'ORGANIZER', {
      workspaceId: 1,
      date: '2026-11-25',
      status: 'CONFIRMED'
    });
    assert.strictEqual(res.totalElements, 1);
    assert.strictEqual(res.content[0].bookingCode, 'BK-20261125-ORG01');
    assert.strictEqual(res.content[0].status, 'CONFIRMED');
    assert.strictEqual(res.content[0].workspaceId, 1);
  });

  it('TC-ORG-07: Search by keyword (booking code, customer name, email, resource code)', () => {
    // Search by code
    const resCode = queryOrganizerBookings(10, 'ORGANIZER', { search: 'ORG02' });
    assert.strictEqual(resCode.totalElements, 1);
    assert.strictEqual(resCode.content[0].bookingCode, 'BK-20261125-ORG02');

    // Search by customer name
    const resName = queryOrganizerBookings(10, 'ORGANIZER', { search: 'Alice' });
    assert.strictEqual(resName.totalElements, 2);

    // Search by email
    const resEmail = queryOrganizerBookings(10, 'ORGANIZER', { search: 'innovate.co' });
    assert.strictEqual(resEmail.totalElements, 1);
    assert.strictEqual(resEmail.content[0].bookingCode, 'BK-20261108-ORG04');

    // Search by resource code
    const resResource = queryOrganizerBookings(10, 'ORGANIZER', { search: 'ROOM-M01' });
    assert.strictEqual(resResource.totalElements, 1);
    assert.strictEqual(resResource.content[0].bookingCode, 'BK-20261125-ORG02');
  });

  it('TC-ORG-08: Security Gate - Organizer Alpha cannot access Workspace 5 owned by Organizer Beta', () => {
    assert.throws(
      () => {
        queryOrganizerBookings(10, 'ORGANIZER', { workspaceId: 5 });
      },
      {
        message: 'Workspace not found or unauthorized'
      }
    );
  });

  it('TC-ORG-09: Pagination boundaries and slice integrity', () => {
    const page1 = queryOrganizerBookings(10, 'ORGANIZER', { page: 1, size: 2 });
    assert.strictEqual(page1.totalElements, 4);
    assert.strictEqual(page1.totalPages, 2);
    assert.strictEqual(page1.content.length, 2);
    assert.strictEqual(page1.first, true);
    assert.strictEqual(page1.last, false);

    const page2 = queryOrganizerBookings(10, 'ORGANIZER', { page: 2, size: 2 });
    assert.strictEqual(page2.content.length, 2);
    assert.strictEqual(page2.first, false);
    assert.strictEqual(page2.last, true);

    // IDs between page 1 and page 2 must be mutually disjoint
    const page1Ids = page1.content.map((b) => b.id);
    const page2Ids = page2.content.map((b) => b.id);
    assert.ok(!page1Ids.some((id) => page2Ids.includes(id)));
  });

  it('TC-ORG-10: KPI Ledger metrics calculation and zero floating-point error', () => {
    const res = queryOrganizerBookings(10, 'ORGANIZER', {});
    const confirmedItems = res.content.filter((b) => b.status === 'CONFIRMED');
    const pendingItems = res.content.filter((b) => b.status === 'PENDING_PAYMENT');
    const cancelledItems = res.content.filter((b) => b.status === 'CANCELLED');

    const confirmedVol = confirmedItems.reduce((acc, b) => acc + b.finalPrice, 0);
    const pendingVol = pendingItems.reduce((acc, b) => acc + b.finalPrice, 0);

    assert.strictEqual(confirmedVol, 216000);
    assert.strictEqual(pendingVol, 324000);
    assert.strictEqual(cancelledItems.length, 1);

    const cancellationRate = (cancelledItems.length / res.totalElements) * 100;
    assert.strictEqual(cancellationRate, 25.0);
  });

});
