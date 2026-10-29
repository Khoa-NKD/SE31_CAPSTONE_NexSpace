export type BlockoutSlotType =
  | 'CONFIRMED_BOOKING'
  | 'MAINTENANCE_DOWNTIME'
  | 'PRIVATE_EVENT';

export type BlockoutReason =
  | 'Facility Maintenance'
  | 'Private Enterprise Event'
  | 'Holiday Closure'
  | 'Deep Cleaning & Sanitation'
  | 'Network & Electrical Upgrade';

export type CalendarViewMode = 'day' | 'week' | 'month';

export interface BlockoutTargetResource {
  id: string;
  name: string;
  code: string;
  capacityLabel: string;
  floor: string;
}

export interface BlockoutEvent {
  id: string;
  title: string;
  subtitle?: string;
  type: BlockoutSlotType;
  resourceId: string;
  resourceName: string;
  floor: string;
  dayOfWeek: number; // 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat, 6 = Sun
  dateDisplay: string; // e.g. "Fri Jan 24"
  startHour: number; // e.g. 13.0 (13:00)
  endHour: number; // e.g. 17.0 (17:00)
  startTimeDisplay: string; // "13:00"
  endTimeDisplay: string; // "17:00"
  durationHours: number; // 4.0
  reason?: BlockoutReason;
  memo?: string;
  attendeesOrTeam?: string; // "Daikin Certified Team" or "VNG Corp Strategy Board"
  tag?: string; // "12 Pax", "Private", "NDAA Required"
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
}

export interface BlockoutMetrics {
  activeBlocksCount: number;
  activeBlocksHours: number;
  nextBlockoutDate: string;
  nextBlockoutReason: string;
  availabilityUptimePercent: number;
}

