import { GanttResource, ScheduleKpiSummary } from '../types';

export const GANTT_START_HOUR = 8;
export const GANTT_END_HOUR = 20;
export const GANTT_TOTAL_HOURS = 12;

export const GANTT_TIMELINE_HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00 - 20:00'
];

export const INITIAL_SCHEDULE_KPIS: ScheduleKpiSummary = {
  bookedHours: 148.5,
  bookedHoursGrowth: 14,
  peakWindow: '14:00 - 16:00',
  peakOccupancyPercent: 92,
  turnstileCurrent: 34,
  turnstileTotal: 38,
  maintenanceBlocksCount: 2,
  resourcesBookedToday: 28,
  totalResources: 42,
  occupancyRatePercent: 66.7
};

export const MOCK_GANTT_RESOURCES: GanttResource[] = [
  {
    id: 'res-desk-a01',
    code: 'DESK-A01',
    name: 'Window Ergonomic Desk 01',
    category: 'HOT_DESK',
    zone: 'Zone A • Quiet Focus',
    zoneCategory: 'ZONE_A',
    status: 'OCCUPIED',
    blocks: [
      {
        id: 'blk-9821',
        bookingCode: '#NX-9821',
        guestName: 'Alex Nguyen',
        companyOrNote: 'Checked In 09:05',
        startTime: '09:00',
        endTime: '13:00',
        startHour: 9.0,
        endHour: 13.0,
        type: 'CONFIRMED',
        statusLabel: 'Checked In 09:05',
        checkedInTime: '09:05 AM',
        amount: 25.0
      }
    ]
  },
  {
    id: 'res-desk-a02',
    code: 'DESK-A02',
    name: 'Standing Desk 02',
    category: 'HOT_DESK',
    zone: 'Zone A • Quiet Focus',
    zoneCategory: 'ZONE_A',
    status: 'SCHEDULED',
    blocks: [
      {
        id: 'blk-9820',
        bookingCode: '#NX-9820',
        guestName: 'Mai Tran',
        companyOrNote: 'PayOS Confirmed',
        startTime: '14:00',
        endTime: '18:00',
        startHour: 14.0,
        endHour: 18.0,
        type: 'CONFIRMED',
        statusLabel: 'PayOS Confirmed',
        amount: 25.0
      }
    ]
  },
  {
    id: 'res-desk-a03',
    code: 'DESK-A03',
    name: 'Corner Desk 03',
    category: 'HOT_DESK',
    zone: 'Zone A • Quiet Focus',
    zoneCategory: 'ZONE_A',
    status: 'MAINTENANCE',
    blocks: [
      {
        id: 'blk-maint-01',
        bookingCode: '#MNT-0412',
        guestName: 'Sanitization & Deep Clean',
        companyOrNote: 'Facility Crew',
        startTime: '12:00',
        endTime: '14:00',
        startHour: 12.0,
        endHour: 14.0,
        type: 'MAINTENANCE',
        statusLabel: 'Facility'
      }
    ]
  },
  {
    id: 'res-desk-b01',
    code: 'DESK-B01',
    name: 'Team Collab Pod 01',
    category: 'DEDICATED_DESK',
    zone: 'Zone B • Collab Hub',
    zoneCategory: 'ZONE_B',
    status: 'OCCUPIED',
    blocks: [
      {
        id: 'blk-9819',
        bookingCode: '#NX-9819',
        guestName: 'David Pham',
        companyOrNote: 'Full-Day Pass',
        startTime: '08:30',
        endTime: '17:30',
        startHour: 8.5,
        endHour: 17.5,
        type: 'CONFIRMED',
        statusLabel: 'Full-Day Pass',
        amount: 45.0,
        checkedInTime: '08:35 AM'
      }
    ]
  },
  {
    id: 'res-desk-b04',
    code: 'DESK-B04',
    name: 'Dual Monitor Pod 04',
    category: 'DEDICATED_DESK',
    zone: 'Zone B • Collab Hub',
    zoneCategory: 'ZONE_B',
    status: 'SCHEDULED',
    blocks: [
      {
        id: 'blk-9817',
        bookingCode: '#NX-9817',
        guestName: 'PayOS Checkout Hold',
        companyOrNote: 'Awaiting Webhook',
        startTime: '10:00',
        endTime: '12:00',
        startHour: 10.0,
        endHour: 12.0,
        type: 'PENDING',
        statusLabel: 'PayOS Hold',
        remainingTime: '06:42 left',
        amount: 20.0
      },
      {
        id: 'blk-9816',
        bookingCode: '#NX-9816',
        guestName: 'Linh Nguyen',
        companyOrNote: 'PayOS Card Confirmed',
        startTime: '15:00',
        endTime: '19:00',
        startHour: 15.0,
        endHour: 19.0,
        type: 'CONFIRMED',
        statusLabel: 'Confirmed',
        amount: 30.0
      }
    ]
  },
  {
    id: 'res-pod-01',
    code: 'POD-01',
    name: 'Acoustic Solo Booth 01',
    category: 'BOOTH',
    zone: 'Acoustic Pod • Solo',
    zoneCategory: 'ZONE_A',
    status: 'SCHEDULED',
    blocks: [
      {
        id: 'blk-9818',
        bookingCode: '#NX-9818',
        guestName: 'Sarah Le',
        companyOrNote: 'Podcast Session',
        startTime: '10:00',
        endTime: '11:30',
        startHour: 10.0,
        endHour: 11.5,
        type: 'CONFIRMED',
        statusLabel: '1.5h Booking',
        amount: 15.0
      }
    ]
  },
  {
    id: 'res-room-c01',
    code: 'ROOM-C01',
    name: 'Executive Boardroom Alpha',
    category: 'MEETING_ROOM',
    zone: 'Boardroom • 16 Pax',
    zoneCategory: 'ZONE_C',
    status: 'OCCUPIED',
    blocks: [
      {
        id: 'blk-vip-01',
        bookingCode: '#NX-9815',
        guestName: 'Fintech VC Pitch',
        companyOrNote: 'VPBank Corporate',
        startTime: '09:00',
        endTime: '11:30',
        startHour: 9.0,
        endHour: 11.5,
        type: 'VIP',
        statusLabel: 'VPBank',
        amount: 180.0
      },
      {
        id: 'blk-vip-02',
        bookingCode: '#NX-9814',
        guestName: 'Product Sprint Meeting (8 pax)',
        companyOrNote: 'Mai Tran / Lead Dev',
        startTime: '13:00',
        endTime: '17:00',
        startHour: 13.0,
        endHour: 17.0,
        type: 'VIP',
        statusLabel: 'Mai Tran / Lead Dev',
        amount: 240.0
      }
    ]
  },
  {
    id: 'res-room-c02',
    code: 'ROOM-C02',
    name: 'Design Thinking Studio Beta',
    category: 'MEETING_ROOM',
    zone: 'Studio • 10 Pax',
    zoneCategory: 'ZONE_C',
    status: 'MAINTENANCE',
    blocks: [
      {
        id: 'blk-maint-02',
        bookingCode: '#MNT-0413',
        guestName: 'HVAC Inspection & Filter',
        companyOrNote: 'Daikin Engineers',
        startTime: '13:00',
        endTime: '15:00',
        startHour: 13.0,
        endHour: 15.0,
        type: 'MAINTENANCE',
        statusLabel: 'HVAC'
      },
      {
        id: 'blk-vip-03',
        bookingCode: '#NX-9813',
        guestName: 'Client Workshop',
        companyOrNote: 'Design Co',
        startTime: '16:00',
        endTime: '19:30',
        startHour: 16.0,
        endHour: 19.5,
        type: 'VIP',
        statusLabel: 'Design Co',
        amount: 210.0
      }
    ]
  }
];

