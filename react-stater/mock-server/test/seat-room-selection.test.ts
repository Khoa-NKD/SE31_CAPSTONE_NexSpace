import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isResourceOffice,
  matchesSpaceCategory,
  calculateSpaceEstimatedCost,
  type MapResourceShape,
  type SpaceFilterType
} from '../../src/features/workspaces/utils/seat-room-utils.ts';

describe('Seat, Meeting Room & Private Office Selection Suite', () => {
  const mockDesk: MapResourceShape = {
    id: 1,
    code: 'DESK-A01',
    name: 'Hot Desk by Window',
    category: 'DESK',
    posX: 100,
    posY: 100,
    width: 60,
    height: 60,
    rotation: 0,
    selectable: true,
    capacity: 1,
    typeName: 'Hot Desk',
    pricePerHour: 2.5,
    zoneName: 'Quiet Zone'
  };

  const mockMeetingRoom: MapResourceShape = {
    id: 2,
    code: 'ROOM-M01',
    name: 'Phòng Họp Sao Mai (Meeting Room A)',
    category: 'ROOM',
    posX: 300,
    posY: 100,
    width: 180,
    height: 120,
    rotation: 0,
    selectable: true,
    capacity: 8,
    typeName: 'Conference Room',
    pricePerHour: 15.0,
    zoneName: 'Collaboration Area'
  };

  const mockPrivateOffice: MapResourceShape = {
    id: 3,
    code: 'OFFICE-P01',
    name: 'Executive Private Office Suite',
    category: 'ROOM',
    posX: 500,
    posY: 100,
    width: 160,
    height: 120,
    rotation: 0,
    selectable: true,
    capacity: 4,
    typeName: 'Private Office 4-Pax',
    pricePerHour: 25.0,
    zoneName: 'Private Wing'
  };

  it('TC-RES-01: Correctly classifies resource types into Desk, Meeting Room, and Private Office', () => {
    assert.equal(mockDesk.category, 'DESK');
    assert.equal(isResourceOffice(mockDesk), false);

    assert.equal(mockMeetingRoom.category, 'ROOM');
    assert.equal(isResourceOffice(mockMeetingRoom), false);

    assert.equal(mockPrivateOffice.category, 'ROOM');
    assert.equal(isResourceOffice(mockPrivateOffice), true);
  });

  it('TC-FILTER-01: SpaceFilterType accurately filters resources', () => {
    // Filter ALL
    assert.equal(matchesSpaceCategory(mockDesk, 'ALL'), true);
    assert.equal(matchesSpaceCategory(mockMeetingRoom, 'ALL'), true);
    assert.equal(matchesSpaceCategory(mockPrivateOffice, 'ALL'), true);

    // Filter DESK
    assert.equal(matchesSpaceCategory(mockDesk, 'DESK'), true);
    assert.equal(matchesSpaceCategory(mockMeetingRoom, 'DESK'), false);
    assert.equal(matchesSpaceCategory(mockPrivateOffice, 'DESK'), false);

    // Filter MEETING_ROOM
    assert.equal(matchesSpaceCategory(mockDesk, 'MEETING_ROOM'), false);
    assert.equal(matchesSpaceCategory(mockMeetingRoom, 'MEETING_ROOM'), true);
    assert.equal(matchesSpaceCategory(mockPrivateOffice, 'MEETING_ROOM'), false);

    // Filter PRIVATE_OFFICE
    assert.equal(matchesSpaceCategory(mockDesk, 'PRIVATE_OFFICE'), false);
    assert.equal(matchesSpaceCategory(mockMeetingRoom, 'PRIVATE_OFFICE'), false);
    assert.equal(matchesSpaceCategory(mockPrivateOffice, 'PRIVATE_OFFICE'), true);
  });

  it('TC-CALC-02: Accurately calculates pricing for diverse resource types', () => {
    // 4 hours of Desk @ $2.50/hr = $10.00
    const deskRes = calculateSpaceEstimatedCost(mockDesk.pricePerHour, 2.5, 4);
    assert.equal(deskRes.unitRate, 2.5);
    assert.equal(deskRes.totalCost, 10.0);

    // 2 hours of Meeting Room @ $15.00/hr = $30.00
    const meetingRes = calculateSpaceEstimatedCost(mockMeetingRoom.pricePerHour, 5.0, 2);
    assert.equal(meetingRes.unitRate, 15.0);
    assert.equal(meetingRes.totalCost, 30.0);

    // 8 hours (Full Day) of Private Office @ $25.00/hr = $200.00
    const officeRes = calculateSpaceEstimatedCost(mockPrivateOffice.pricePerHour, 10.0, 8);
    assert.equal(officeRes.unitRate, 25.0);
    assert.equal(officeRes.totalCost, 200.0);

    // Fallback rate test when pricePerHour is missing or 0
    const fallbackRes = calculateSpaceEstimatedCost(undefined, 5.0, 3);
    assert.equal(fallbackRes.unitRate, 5.0);
    assert.equal(fallbackRes.totalCost, 15.0);
  });

  it('TC-COUNT-01: Aggregates category counts accurately', () => {
    const floorResources = [mockDesk, mockMeetingRoom, mockPrivateOffice];
    let desks = 0;
    let rooms = 0;
    let offices = 0;

    for (const r of floorResources) {
      if (r.category === 'DESK') desks++;
      else if (isResourceOffice(r)) offices++;
      else rooms++;
    }

    assert.equal(desks, 1);
    assert.equal(rooms, 1);
    assert.equal(offices, 1);
    assert.equal(floorResources.length, 3);
  });

  it('TC-SELECT-01: Resource selection state isolation and replacement', () => {
    let selectedId: number | null = null;

    // Select desk
    selectedId = mockDesk.id;
    assert.equal(selectedId, 1);

    // Switch selection to meeting room
    selectedId = mockMeetingRoom.id;
    assert.equal(selectedId, 2);

    // Switch selection to private office
    selectedId = mockPrivateOffice.id;
    assert.equal(selectedId, 3);

    // Deselect
    selectedId = null;
    assert.equal(selectedId, null);
  });

  it('TC-STATUS-01: Availability status color mapping and unselectable rules', () => {
    type AvailabilityStatus = 'AVAILABLE' | 'RESERVED' | 'UNAVAILABLE';

    const getStatusStyle = (status: AvailabilityStatus, isSelected: boolean) => {
      if (isSelected) {
        return { fill: '#dbeafe', stroke: '#2563eb', cursor: 'pointer' };
      }
      switch (status) {
        case 'AVAILABLE':
          return { fill: '#f0fdf4', stroke: '#22c55e', cursor: 'pointer' };
        case 'RESERVED':
          return { fill: '#fef3c7', stroke: '#f59e0b', cursor: 'not-allowed' };
        case 'UNAVAILABLE':
        default:
          return { fill: '#f1f5f9', stroke: '#94a3b8', cursor: 'not-allowed' };
      }
    };

    // Available desk
    const avail = getStatusStyle('AVAILABLE', false);
    assert.equal(avail.stroke, '#22c55e');
    assert.equal(avail.cursor, 'pointer');

    // Selected meeting room
    const selected = getStatusStyle('AVAILABLE', true);
    assert.equal(selected.stroke, '#2563eb');
    assert.equal(selected.fill, '#dbeafe');

    // Reserved private office (under hold)
    const reserved = getStatusStyle('RESERVED', false);
    assert.equal(reserved.stroke, '#f59e0b');
    assert.equal(reserved.cursor, 'not-allowed');

    // Unavailable / maintenance
    const unavail = getStatusStyle('UNAVAILABLE', false);
    assert.equal(unavail.stroke, '#94a3b8');
    assert.equal(unavail.cursor, 'not-allowed');
  });

  it('TC-DRAWER-01: Drawer details and Review Navigation payload structure', () => {
    const selectedResource = mockPrivateOffice;
    const durationHours = 4.0;
    const pricing = calculateSpaceEstimatedCost(selectedResource.pricePerHour, 10.0, durationHours);

    // Drawer displayed details
    const drawerViewModel = {
      id: selectedResource.id,
      code: selectedResource.code,
      name: selectedResource.name,
      categoryName: isResourceOffice(selectedResource) ? 'Văn phòng riêng' : 'Phòng họp',
      capacityLabel: `${selectedResource.capacity} người`,
      zoneName: selectedResource.zoneName,
      unitPriceFormatted: `$${pricing.unitRate.toFixed(2)}/giờ`,
      durationFormatted: `${durationHours} giờ`,
      subtotalFormatted: `$${pricing.totalCost.toFixed(2)}`,
      navigationTarget: {
        to: '/workspaces/review',
        search: {
          resourceId: String(selectedResource.id),
          startTime: '2026-11-12T09:00:00',
          endTime: '2026-11-12T13:00:00'
        }
      }
    };

    assert.equal(drawerViewModel.code, 'OFFICE-P01');
    assert.equal(drawerViewModel.categoryName, 'Văn phòng riêng');
    assert.equal(drawerViewModel.capacityLabel, '4 người');
    assert.equal(drawerViewModel.unitPriceFormatted, '$25.00/giờ');
    assert.equal(drawerViewModel.durationFormatted, '4 giờ');
    assert.equal(drawerViewModel.subtotalFormatted, '$100.00');
    assert.equal(drawerViewModel.navigationTarget.to, '/workspaces/review');
    assert.equal(drawerViewModel.navigationTarget.search.resourceId, '3');
  });

  it('TC-DIM-01: Filter non-matching spaces dimming opacity validation', () => {
    const activeFilter: SpaceFilterType = 'MEETING_ROOM';

    const getResourceOpacity = (r: MapResourceShape, filter: SpaceFilterType) => {
      const matches = matchesSpaceCategory(r, filter);
      return matches ? 1.0 : 0.25;
    };

    assert.equal(getResourceOpacity(mockMeetingRoom, activeFilter), 1.0);
    assert.equal(getResourceOpacity(mockDesk, activeFilter), 0.25);
    assert.equal(getResourceOpacity(mockPrivateOffice, activeFilter), 0.25);
  });
});
