export type SeatCategory = 'all' | 'hot_desk' | 'dedicated_desk' | 'meeting_pod';

export type SeatStatus = 'available_now' | 'available' | 'reserved' | 'occupied';

export interface SeatAmenity {
  icon: string;
  label: string;
}

export interface SeatItem {
  id: string;
  code: string;
  name: string;
  category: 'hot_desk' | 'dedicated_desk' | 'meeting_pod';
  level: 14 | 15;
  zone: string;
  zoneDescription: string;
  tag: string;
  status: SeatStatus;
  statusLabel: string;
  pricePerHour: number;
  imageUrl: string;
  imageAlt: string;
  isTopPick?: boolean;
  amenities: SeatAmenity[];
  bookingGuarantee: string;
  guaranteeSubtext: string;
  microcopy: string;
  coordinates: { x: number; y: number };
}

