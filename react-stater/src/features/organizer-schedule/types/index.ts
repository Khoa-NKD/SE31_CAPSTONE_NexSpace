export type GanttBlockType =
  | 'CONFIRMED'
  | 'PENDING'
  | 'MAINTENANCE'
  | 'VIP'
  | 'AVAILABLE';

export interface GanttBookingBlock {
  id: string;
  bookingCode: string;
  guestName: string;
  companyOrNote?: string;
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "13:00"
  startHour: number; // e.g. 9.0 (offset from 08:00 to 20:00)
  endHour: number; // e.g. 13.0
  type: GanttBlockType;
  statusLabel: string; // e.g. "Checked In 09:05", "PayOS Confirmed", "PayOS Hold"
  checkedInTime?: string;
  amount?: number;
  remainingTime?: string; // e.g. "06:42 left"
}

export type ResourceCategoryType =
  | 'HOT_DESK'
  | 'DEDICATED_DESK'
  | 'BOOTH'
  | 'MEETING_ROOM';

export interface GanttResource {
  id: string;
  code: string; // e.g. "DESK-A01"
  name: string;
  category: ResourceCategoryType;
  zone: string; // e.g. "Zone A • Quiet Focus"
  zoneCategory: 'ZONE_A' | 'ZONE_B' | 'ZONE_C';
  status: 'OCCUPIED' | 'SCHEDULED' | 'MAINTENANCE' | 'AVAILABLE';
  blocks: GanttBookingBlock[];
}

export interface ScheduleKpiSummary {
  bookedHours: number;
  bookedHoursGrowth: number;
  peakWindow: string;
  peakOccupancyPercent: number;
  turnstileCurrent: number;
  turnstileTotal: number;
  maintenanceBlocksCount: number;
  resourcesBookedToday: number;
  totalResources: number;
  occupancyRatePercent: number;
}

export type ViewTimelineMode = 'DAY' | 'WEEK' | 'MONTH';

