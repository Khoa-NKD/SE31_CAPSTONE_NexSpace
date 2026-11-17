import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Organizer Booking Calendar & Gantt Timeline Test Suite', () => {

  interface CalendarBookingEvent {
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
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    startTime: string; // ISO LocalDateTime string
    endTime: string;
    durationHours: number;
    finalPrice: number;
    status: 'CONFIRMED' | 'PENDING_PAYMENT' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
  }

  // Realistic Database seed
  const mockDatabase: CalendarBookingEvent[] = [
    {
      id: 6001,
      bookingCode: 'BK-20261120-CAL01',
      organizerId: 10, // Organizer Alpha
      workspaceId: 1, // Workspace Saigon Prime
      workspaceName: 'NexSpace Saigon Prime Hub',
      resourceId: 101,
      resourceCode: 'DESK-A01',
      resourceName: 'Hot Desk A01 (Quiet Focus)',
      resourceCategory: 'DESK',
      customerId: 50,
      customerName: 'Alice Nguyen',
      customerEmail: 'alice@nexspace.vn',
      customerPhone: '+84901234567',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T13:00:00',
      durationHours: 4.0,
      finalPrice: 120000,
      status: 'CONFIRMED',
      createdAt: '2026-11-12T05:00:00'
    },
    {
      id: 6002,
      bookingCode: 'BK-20261120-CAL02',
      organizerId: 10, // Organizer Alpha
      workspaceId: 1, // Workspace Saigon Prime
      workspaceName: 'NexSpace Saigon Prime Hub',
      resourceId: 102,
      resourceCode: 'ROOM-M01',
      resourceName: 'Meeting Room Alpha (Boardroom)',
      resourceCategory: 'MEETING_ROOM',
      customerId: 51,
      customerName: 'Charlie Vu',
      customerEmail: 'charlie.vu@gmail.com',
      customerPhone: '+84912345678',
      startTime: '2026-11-20T14:00:00',
      endTime: '2026-11-20T17:00:00',
      durationHours: 3.0,
      finalPrice: 450000,
      status: 'PENDING_PAYMENT',
      createdAt: '2026-11-12T06:00:00'
    },
    {
      id: 6003,
      bookingCode: 'BK-20261121-CAL03',
      organizerId: 10, // Organizer Alpha
      workspaceId: 1, // Workspace Saigon Prime
      workspaceName: 'NexSpace Saigon Prime Hub',
      resourceId: 103,
      resourceCode: 'OFFICE-P01',
      resourceName: 'Private Office Suite 01',
      resourceCategory: 'PRIVATE_OFFICE',
      customerId: 52,
      customerName: 'David Pham',
      customerEmail: 'david.p@innovate.co',
      customerPhone: '+84988776655',
      startTime: '2026-11-21T08:30:00',
      endTime: '2026-11-21T18:30:00',
      durationHours: 10.0,
      finalPrice: 1500000,
      status: 'CONFIRMED',
      createdAt: '2026-11-12T07:00:00'
    },
    {
      id: 6004,
      bookingCode: 'BK-20261125-CAL04',
      organizerId: 10, // Organizer Alpha
      workspaceId: 2, // Workspace Saigon Hub (Different WS of same organizer)
      workspaceName: 'NexSpace Saigon Hub',
      resourceId: 201,
      resourceCode: 'DESK-B01',
      resourceName: 'Dedicated Desk B01',
      resourceCategory: 'DESK',
      customerId: 53,
      customerName: 'Emma Watson',
      customerEmail: 'emma@global.org',
      customerPhone: '+84909090909',
      startTime: '2026-11-25T10:00:00',
      endTime: '2026-11-25T16:00:00',
      durationHours: 6.0,
      finalPrice: 240000,
      status: 'CONFIRMED',
      createdAt: '2026-11-12T08:00:00'
    },
    {
      id: 6005,
      bookingCode: 'BK-20261120-BETA01',
      organizerId: 99, // Organizer Beta (DIFFERENT ORGANIZER)
      workspaceId: 5, // Workspace owned by Beta
      workspaceName: 'Beta Coworking Space',
      resourceId: 501,
      resourceCode: 'DESK-X01',
      resourceName: 'Hot Desk X01',
      resourceCategory: 'DESK',
      customerId: 60,
      customerName: 'Frank Le',
      customerEmail: 'frank@beta.com',
      customerPhone: '+84933221100',
      startTime: '2026-11-20T09:00:00',
      endTime: '2026-11-20T12:00:00',
      durationHours: 3.0,
      finalPrice: 90000,
      status: 'CONFIRMED',
      createdAt: '2026-11-12T09:00:00'
    }
  ];

  // Calendar query service logic matching Spring Boot findOrganizerCalendarBookings
  function queryOrganizerCalendarEvents(
    currentUserId: number,
    currentUserRole: 'ORGANIZER' | 'ADMIN',
    filters: {
      workspaceId?: number;
      date?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    }
  ): CalendarBookingEvent[] {
    let items = mockDatabase.slice();

    // 1. Strict Tenant Isolation
    if (currentUserRole === 'ORGANIZER') {
      items = items.filter((b) => b.organizerId === currentUserId);

      if (filters.workspaceId) {
        const ownsWorkspace = mockDatabase.some(
          (b) => b.workspaceId === filters.workspaceId && b.organizerId === currentUserId
        );
        if (!ownsWorkspace) {
          throw new Error('Không tìm thấy không gian làm việc với ID: ' + filters.workspaceId);
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

    // 3. Date / Date Range filter
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

    // Sort by startTime ASC (chronological for calendar & timeline)
    items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return items;
  }

  // TEST CASES

  it('TC-CAL-01: Organizer retrieves calendar events for specific date (2026-11-20)', () => {
    const events = queryOrganizerCalendarEvents(10, 'ORGANIZER', { date: '2026-11-20' });
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].bookingCode, 'BK-20261120-CAL01');
    assert.strictEqual(events[1].bookingCode, 'BK-20261120-CAL02');
    assert.ok(events.every((e) => e.organizerId === 10));
    assert.ok(events.every((e) => e.startTime.startsWith('2026-11-20')));
  });

  it('TC-CAL-02: Organizer retrieves calendar events for a Date Range (e.g. Month 2026-11-01 to 2026-11-30)', () => {
    const events = queryOrganizerCalendarEvents(10, 'ORGANIZER', {
      startDate: '2026-11-01',
      endDate: '2026-11-30'
    });
    assert.strictEqual(events.length, 4);
    assert.ok(events.every((e) => e.organizerId === 10));
    // Must be sorted chronologically
    assert.strictEqual(events[0].bookingCode, 'BK-20261120-CAL01');
    assert.strictEqual(events[1].bookingCode, 'BK-20261120-CAL02');
    assert.strictEqual(events[2].bookingCode, 'BK-20261121-CAL03');
    assert.strictEqual(events[3].bookingCode, 'BK-20261125-CAL04');
  });

  it('TC-CAL-03: Filter calendar events by Workspace ID (Workspace 1 vs Workspace 2)', () => {
    const ws1Events = queryOrganizerCalendarEvents(10, 'ORGANIZER', { workspaceId: 1 });
    assert.strictEqual(ws1Events.length, 3);
    assert.ok(ws1Events.every((e) => e.workspaceId === 1));

    const ws2Events = queryOrganizerCalendarEvents(10, 'ORGANIZER', { workspaceId: 2 });
    assert.strictEqual(ws2Events.length, 1);
    assert.strictEqual(ws2Events[0].bookingCode, 'BK-20261125-CAL04');
  });

  it('TC-CAL-04: Filter calendar events by Status (CONFIRMED vs PENDING_PAYMENT)', () => {
    const confirmedEvents = queryOrganizerCalendarEvents(10, 'ORGANIZER', {
      date: '2026-11-20',
      status: 'CONFIRMED'
    });
    assert.strictEqual(confirmedEvents.length, 1);
    assert.strictEqual(confirmedEvents[0].bookingCode, 'BK-20261120-CAL01');

    const pendingEvents = queryOrganizerCalendarEvents(10, 'ORGANIZER', {
      date: '2026-11-20',
      status: 'PENDING_PAYMENT'
    });
    assert.strictEqual(pendingEvents.length, 1);
    assert.strictEqual(pendingEvents[0].bookingCode, 'BK-20261120-CAL02');
  });

  it('TC-CAL-05: Multi-tenant Security Check - Organizer Alpha cannot query Workspace 5 of Organizer Beta', () => {
    assert.throws(
      () => {
        queryOrganizerCalendarEvents(10, 'ORGANIZER', { workspaceId: 5 });
      },
      {
        message: 'Không tìm thấy không gian làm việc với ID: 5'
      }
    );
  });

  it('TC-CAL-06: Platform Admin privileged access queries any workspace calendar', () => {
    const adminEvents = queryOrganizerCalendarEvents(999, 'ADMIN', { workspaceId: 5 });
    assert.strictEqual(adminEvents.length, 1);
    assert.strictEqual(adminEvents[0].bookingCode, 'BK-20261120-BETA01');
  });

  it('TC-CAL-07: Gantt Timeline Coordinates conversion without timezone distortion', () => {
    const events = queryOrganizerCalendarEvents(10, 'ORGANIZER', { date: '2026-11-20' });
    const e1 = events[0]; // 09:00:00 to 13:00:00
    const start1 = new Date(e1.startTime);
    const end1 = new Date(e1.endTime);
    const startHour1 = start1.getHours() + start1.getMinutes() / 60;
    const endHour1 = end1.getHours() + end1.getMinutes() / 60;

    assert.strictEqual(startHour1, 9.0);
    assert.strictEqual(endHour1, 13.0);
    assert.strictEqual(endHour1 - startHour1, 4.0);

    const e2 = events[1]; // 14:00:00 to 17:00:00
    const start2 = new Date(e2.startTime);
    const end2 = new Date(e2.endTime);
    const startHour2 = start2.getHours() + start2.getMinutes() / 60;
    const endHour2 = end2.getHours() + end2.getMinutes() / 60;

    assert.strictEqual(startHour2, 14.0);
    assert.strictEqual(endHour2, 17.0);
  });

  it('TC-CAL-08: Real-time KPI Ribbon calculation from active day bookings', () => {
    const events = queryOrganizerCalendarEvents(10, 'ORGANIZER', { date: '2026-11-20' });
    const totalBookedHours = events.reduce((sum, e) => sum + e.durationHours, 0);
    assert.strictEqual(totalBookedHours, 7.0); // 4 + 3

    const distinctResources = new Set(events.map((e) => e.resourceId)).size;
    assert.strictEqual(distinctResources, 2);

    const totalResourcesOnFloor = 10;
    const occupancyPercent = (distinctResources / totalResourcesOnFloor) * 100;
    assert.strictEqual(occupancyPercent, 20.0);
  });

  it('TC-CAL-09: Monthly Calendar view groups bookings into date buckets', () => {
    const monthlyEvents = queryOrganizerCalendarEvents(10, 'ORGANIZER', {
      startDate: '2026-11-01',
      endDate: '2026-11-30'
    });

    const dateBuckets = new Map<string, CalendarBookingEvent[]>();
    for (const ev of monthlyEvents) {
      const d = ev.startTime.slice(0, 10);
      const list = dateBuckets.get(d) || [];
      list.push(ev);
      dateBuckets.set(d, list);
    }

    assert.strictEqual(dateBuckets.get('2026-11-20')?.length, 2);
    assert.strictEqual(dateBuckets.get('2026-11-21')?.length, 1);
    assert.strictEqual(dateBuckets.get('2026-11-25')?.length, 1);
    assert.strictEqual(dateBuckets.get('2026-11-15'), undefined);
  });

  it('TC-CAL-10: Empty state handling returns empty array with zero error when no bookings match', () => {
    const emptyEvents = queryOrganizerCalendarEvents(10, 'ORGANIZER', { date: '2026-12-31' });
    assert.strictEqual(emptyEvents.length, 0);
    assert.deepStrictEqual(emptyEvents, []);
  });

});
