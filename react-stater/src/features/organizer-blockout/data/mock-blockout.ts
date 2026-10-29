import {
  BlockoutMetrics,
  BlockoutTargetResource,
  BlockoutEvent
} from '../types';

export const INITIAL_BLOCKOUT_METRICS: BlockoutMetrics = {
  activeBlocksCount: 3,
  activeBlocksHours: 14,
  nextBlockoutDate: 'Jan 24',
  nextBlockoutReason: 'HVAC',
  availabilityUptimePercent: 96.8
};

export const AVAILABLE_TARGET_RESOURCES: BlockoutTargetResource[] = [
  {
    id: 'res-meet-c01',
    name: 'Meeting Room C01 — Executive Boardroom',
    code: 'MEET-C01',
    capacityLabel: '12 Pax',
    floor: 'Floor 12'
  },
  {
    id: 'res-meet-c02',
    name: 'Meeting Room C02 — Creative Studio',
    code: 'MEET-C02',
    capacityLabel: '8 Pax',
    floor: 'Floor 12'
  },
  {
    id: 'res-pod-alpha',
    name: 'Focus Pod Alpha — Individual',
    code: 'POD-ALPHA',
    capacityLabel: '1 Pax',
    floor: 'Floor 12'
  },
  {
    id: 'res-zone-a',
    name: 'Zone A Hot Desks — Entire Bay',
    code: 'ZONE-A',
    capacityLabel: '24 Pax',
    floor: 'Floor 12'
  },
  {
    id: 'res-townhall',
    name: 'Event Townhall Stage',
    code: 'STAGE-01',
    capacityLabel: '80 Pax',
    floor: 'Floor 14'
  }
];

export const INITIAL_CALENDAR_EVENTS: BlockoutEvent[] = [
  {
    id: 'evt-mon-fintech',
    title: 'Fintech Tech Demo',
    subtitle: 'Nguyen Vu (VPBank)',
    type: 'CONFIRMED_BOOKING',
    resourceId: 'res-meet-c01',
    resourceName: 'Meeting Room C01 — Boardroom',
    floor: 'Floor 12',
    dayOfWeek: 0,
    dateDisplay: 'Mon Jan 20',
    startHour: 9.0,
    endHour: 11.5,
    startTimeDisplay: '09:00',
    endTimeDisplay: '11:30',
    durationHours: 2.5,
    tag: '12 Pax',
    status: 'ACTIVE'
  },
  {
    id: 'evt-tue-venture',
    title: 'Venture Pitch Sync',
    subtitle: 'Sarah Le (500 Global)',
    type: 'CONFIRMED_BOOKING',
    resourceId: 'res-meet-c01',
    resourceName: 'Meeting Room C01 — Boardroom',
    floor: 'Floor 12',
    dayOfWeek: 1,
    dateDisplay: 'Tue Jan 21',
    startHour: 14.0,
    endHour: 16.0,
    startTimeDisplay: '14:00',
    endTimeDisplay: '16:00',
    durationHours: 2.0,
    tag: 'Boardroom',
    status: 'ACTIVE'
  },
  {
    id: 'evt-wed-design',
    title: 'Design Sprint Review',
    subtitle: 'NexLab Team',
    type: 'CONFIRMED_BOOKING',
    resourceId: 'res-meet-c01',
    resourceName: 'Meeting Room C01 — Boardroom',
    floor: 'Floor 12',
    dayOfWeek: 2,
    dateDisplay: 'Wed Jan 22',
    startHour: 10.0,
    endHour: 12.0,
    startTimeDisplay: '10:00',
    endTimeDisplay: '12:00',
    durationHours: 2.0,
    tag: 'Private',
    status: 'ACTIVE'
  },
  {
    id: 'evt-fri-hvac',
    title: 'HVAC Maintenance',
    subtitle: 'Filter Replacement & Duct Sanitization',
    type: 'MAINTENANCE_DOWNTIME',
    resourceId: 'res-meet-c01',
    resourceName: 'Meeting Room C01 — Boardroom',
    floor: 'Floor 12',
    dayOfWeek: 4,
    dateDisplay: 'Fri Jan 24',
    startHour: 13.0,
    endHour: 17.0,
    startTimeDisplay: '13:00',
    endTimeDisplay: '17:00',
    durationHours: 4.0,
    reason: 'Facility Maintenance',
    attendeesOrTeam: 'Daikin Certified Team',
    memo: 'Annual HVAC overhaul & air quality filter certification by Daikin Team.',
    status: 'UPCOMING'
  },
  {
    id: 'evt-sat-vng',
    title: 'Private VIP Enterprise Event',
    subtitle: 'VNG Corp Strategy Board',
    type: 'PRIVATE_EVENT',
    resourceId: 'res-meet-c01',
    resourceName: 'Meeting Room C01 — Boardroom',
    floor: 'Floor 12',
    dayOfWeek: 5,
    dateDisplay: 'Sat Jan 25',
    startHour: 16.0,
    endHour: 19.0,
    startTimeDisplay: '16:00',
    endTimeDisplay: '19:00',
    durationHours: 3.0,
    reason: 'Private Enterprise Event',
    attendeesOrTeam: 'NDAA Required',
    memo: 'Confidential executive meeting with private catering and card access.',
    status: 'UPCOMING'
  }
];

export const UPCOMING_SCHEDULED_BLOCKS = [
  {
    id: 'block-01',
    title: 'HVAC Maintenance & Filter Replacement',
    resourceName: 'Meeting Room C01 — Floor 12',
    dateDisplay: 'Fri Jan 24',
    timeRangeDisplay: '13:00 - 17:00 (4h)',
    reasonType: 'MAINTENANCE',
    iconType: 'build'
  },
  {
    id: 'block-02',
    title: 'Private Enterprise Event (VNG Corp)',
    resourceName: 'Meeting Room C01 — Floor 12',
    dateDisplay: 'Sat Jan 25',
    timeRangeDisplay: '16:00 - 19:00 (3h)',
    reasonType: 'EVENT',
    iconType: 'lock'
  },
  {
    id: 'block-03',
    title: 'Fiber Optic Router Upgrade',
    resourceName: 'Zone A Hot Desks (24 Seats)',
    dateDisplay: 'Mon Feb 02',
    timeRangeDisplay: '08:00 - 10:00 (2h)',
    reasonType: 'NETWORK',
    iconType: 'router'
  }
];

