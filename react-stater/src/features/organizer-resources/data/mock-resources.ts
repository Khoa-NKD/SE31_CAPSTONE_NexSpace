import { ResourceItem, ResourceKpiSummary } from '../types';

export const INITIAL_RESOURCE_KPIS: ResourceKpiSummary = {
  totalUnits: 47,
  activeBookable: 44,
  uptimePercent: 93.6,
  maintenanceCount: 3,
  maintenanceNote: 'Pending hardware check',
  averageHourlyRate: 3.45,
  occupancyPercent: 68
};

export const INITIAL_MOCK_RESOURCES: ResourceItem[] = [
  {
    id: 'res-1',
    code: 'DESK-A01',
    subLabel: 'RFID #88219',
    type: 'HOT_DESK',
    zone: 'ZONE_A',
    zoneLabel: 'Zone A — Quiet Focus',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.5,
    dailyRate: 18.0,
    amenities: [
      { name: 'Ergonomic Chair' },
      { name: 'Power Socket' },
      { name: 'Type-C' }
    ],
    status: 'BOOKABLE',
    rfidCode: '#88219'
  },
  {
    id: 'res-2',
    code: 'DESK-A02',
    subLabel: 'RFID #88220',
    type: 'HOT_DESK',
    zone: 'ZONE_A',
    zoneLabel: 'Zone A — Quiet Focus',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.5,
    dailyRate: 18.0,
    amenities: [
      { name: 'Ergonomic Chair' },
      { name: 'Power Socket' }
    ],
    status: 'BOOKABLE',
    rfidCode: '#88220'
  },
  {
    id: 'res-3',
    code: 'DESK-A08',
    subLabel: 'Port damaged',
    warningNote: 'Port damaged',
    type: 'HOT_DESK',
    zone: 'ZONE_A',
    zoneLabel: 'Zone A — Quiet Focus',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.5,
    dailyRate: 18.0,
    amenities: [
      { name: 'Ergonomic Chair' },
      { name: 'Power Socket', isUnavailable: true }
    ],
    status: 'DISABLED'
  },
  {
    id: 'res-4',
    code: 'DESK-B01',
    subLabel: 'Dual-Display Pod',
    type: 'DEDICATED_DESK',
    zone: 'ZONE_B',
    zoneLabel: 'Zone B — Collaborative Hub',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 3.0,
    dailyRate: 22.0,
    amenities: [
      { name: 'Dual 27" 4K' },
      { name: 'Motorized Desk' },
      { name: 'Ethernet' }
    ],
    status: 'BOOKABLE'
  },
  {
    id: 'res-5',
    code: 'DESK-B04',
    subLabel: 'RFID #88344',
    type: 'DEDICATED_DESK',
    zone: 'ZONE_B',
    zoneLabel: 'Zone B — Collaborative Hub',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 3.0,
    dailyRate: 22.0,
    amenities: [
      { name: 'Motorized Desk' },
      { name: 'Power Socket' }
    ],
    status: 'BOOKABLE',
    rfidCode: '#88344'
  },
  {
    id: 'res-6',
    code: 'ROOM-C01',
    subLabel: 'Executive Boardroom',
    type: 'MEETING_ROOM',
    zone: 'ZONE_C',
    zoneLabel: 'Zone C — Executive Suites',
    capacity: 12,
    capacityLabel: '12 People',
    hourlyRate: 18.0,
    dailyRate: 120.0,
    amenities: [
      { name: '4K Video Bar' },
      { name: 'Jabra Mic' },
      { name: 'Smart Whiteboard' }
    ],
    status: 'BOOKABLE'
  },
  {
    id: 'res-7',
    code: 'ROOM-C02',
    subLabel: 'Strategy Room',
    type: 'MEETING_ROOM',
    zone: 'ZONE_C',
    zoneLabel: 'Zone C — Executive Suites',
    capacity: 6,
    capacityLabel: '6 People',
    hourlyRate: 12.0,
    dailyRate: 85.0,
    amenities: [
      { name: '55" TV' },
      { name: 'Glass Board' }
    ],
    status: 'BOOKABLE'
  },
  {
    id: 'res-8',
    code: 'ROOM-C03',
    subLabel: 'Media & Podcast Pod',
    type: 'MEETING_ROOM',
    zone: 'ZONE_C',
    zoneLabel: 'Zone C — Executive Suites',
    capacity: 4,
    capacityLabel: '4 People',
    hourlyRate: 10.0,
    dailyRate: 70.0,
    amenities: [
      { name: 'Acoustic Padding' },
      { name: 'Shure Mics' }
    ],
    status: 'BOOKABLE'
  },
  // Expanded inventory to populate 47 total items
  {
    id: 'res-9',
    code: 'DESK-A03',
    subLabel: 'RFID #88221',
    type: 'HOT_DESK',
    zone: 'ZONE_A',
    zoneLabel: 'Zone A — Quiet Focus',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.5,
    dailyRate: 18.0,
    amenities: [{ name: 'Ergonomic Chair' }, { name: 'Power Socket' }],
    status: 'BOOKABLE',
    rfidCode: '#88221'
  },
  {
    id: 'res-10',
    code: 'DESK-A04',
    subLabel: 'RFID #88222',
    type: 'HOT_DESK',
    zone: 'ZONE_A',
    zoneLabel: 'Zone A — Quiet Focus',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.5,
    dailyRate: 18.0,
    amenities: [{ name: 'Ergonomic Chair' }, { name: 'Type-C' }],
    status: 'BOOKABLE',
    rfidCode: '#88222'
  },
  {
    id: 'res-11',
    code: 'DESK-A05',
    subLabel: 'Maintenance Scheduled',
    warningNote: 'Hardware recalibration',
    type: 'HOT_DESK',
    zone: 'ZONE_A',
    zoneLabel: 'Zone A — Quiet Focus',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.5,
    dailyRate: 18.0,
    amenities: [{ name: 'Ergonomic Chair' }],
    status: 'DISABLED'
  },
  {
    id: 'res-12',
    code: 'DESK-B02',
    subLabel: 'UltraWide Screen',
    type: 'DEDICATED_DESK',
    zone: 'ZONE_B',
    zoneLabel: 'Zone B — Collaborative Hub',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 3.2,
    dailyRate: 24.0,
    amenities: [{ name: '34" Curved Monitor' }, { name: 'Motorized Desk' }],
    status: 'BOOKABLE'
  },
  {
    id: 'res-13',
    code: 'DESK-B03',
    subLabel: 'Dual Monitor Pod',
    type: 'DEDICATED_DESK',
    zone: 'ZONE_B',
    zoneLabel: 'Zone B — Collaborative Hub',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 3.0,
    dailyRate: 22.0,
    amenities: [{ name: 'Dual 24" FHD' }, { name: 'Ethernet' }],
    status: 'BOOKABLE'
  },
  {
    id: 'res-14',
    code: 'DESK-B05',
    subLabel: 'Standing Desk Only',
    type: 'DEDICATED_DESK',
    zone: 'ZONE_B',
    zoneLabel: 'Zone B — Collaborative Hub',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.8,
    dailyRate: 20.0,
    amenities: [{ name: 'Motorized Desk' }, { name: 'Power Socket' }],
    status: 'BOOKABLE'
  },
  {
    id: 'res-15',
    code: 'DESK-A09',
    subLabel: 'RFID #88229',
    type: 'HOT_DESK',
    zone: 'ZONE_A',
    zoneLabel: 'Zone A — Quiet Focus',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.5,
    dailyRate: 18.0,
    amenities: [{ name: 'Ergonomic Chair' }, { name: 'Power Socket' }],
    status: 'BOOKABLE',
    rfidCode: '#88229'
  },
  {
    id: 'res-16',
    code: 'DESK-A10',
    subLabel: 'Under inspection',
    warningNote: 'Leg screw loose',
    type: 'HOT_DESK',
    zone: 'ZONE_A',
    zoneLabel: 'Zone A — Quiet Focus',
    capacity: 1,
    capacityLabel: '1 Person',
    hourlyRate: 2.5,
    dailyRate: 18.0,
    amenities: [{ name: 'Ergonomic Chair' }],
    status: 'DISABLED'
  }
];

