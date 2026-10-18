import {
  ResourceTypeConfig,
  ResourcePhoto,
  AmenityItem,
  CreateResourceFormData
} from '../types';

export const RESOURCE_TYPE_CONFIGS: ResourceTypeConfig[] = [
  {
    type: 'HOT_DESK',
    label: 'Hot Desk',
    badge: 'Single',
    icon: 'Laptop',
    defaultCapacity: 1,
    description: 'Flexible unassigned seat in open workspace'
  },
  {
    type: 'DEDICATED_DESK',
    label: 'Dedicated Desk',
    badge: 'Single Seat',
    icon: 'Armchair',
    defaultCapacity: 1,
    description: 'Fixed reserved desk with personal monitor setup'
  },
  {
    type: 'PODCAST_BOOTH',
    label: 'Podcast Booth',
    badge: 'Soundproof',
    icon: 'Mic',
    defaultCapacity: 1,
    description: 'Acoustic micro-studio for voice, calls, and recording'
  },
  {
    type: 'MEETING_ROOM',
    label: 'Meeting Room',
    badge: '6 Pax',
    icon: 'Users',
    defaultCapacity: 6,
    description: 'Enclosed room with smart display and video conference'
  },
  {
    type: 'PRIVATE_OFFICE',
    label: 'Private Office',
    badge: 'Suite',
    icon: 'Building2',
    defaultCapacity: 4,
    description: 'Lockable executive office for teams'
  },
  {
    type: 'EVENT_HALL',
    label: 'Event Hall',
    badge: '50+ Pax',
    icon: 'Sparkles',
    defaultCapacity: 50,
    description: 'Full-stage space for community meetups and demos'
  }
];

export const FLOOR_OPTIONS = [
  'Floor 12 — Main Coworking Floor',
  'Floor 14 — Executive Suites',
  'Floor 15 — Innovation Labs'
];

export const ZONE_OPTIONS = [
  'Zone A — Quiet Focus Zone (No calls allowed)',
  'Zone B — Collaborative Open Space',
  'Zone C — Window Perimeter Facing East'
];

export const INITIAL_RESOURCE_PHOTOS: ResourcePhoto[] = [
  {
    id: 'photo-1',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1UIdSVk6MUzmhBeOyprhzPqV7rh7BP5PBq4dBUtS22JsoNW8Ngczi9CrQQwfVwBVHnjOLNWr4uFeizVznnN7MppTiqt2w0ehK5qDg48eFA8V9iihsIyUKjG6__9XJH7K8a4bBlKYOwqNfot6Weode9p66dpCkGUw5MHlZXWL18539ipBfucT4Fr2Y8K4ElVpGlnP-29Bk1Qgg7QYUGVatgFd5ft1ZGs4yIabMYQ_hhrHmdEI2lIFBnUJ0F3',
    label: 'Desk Cover Photo',
    isPrimary: true
  },
  {
    id: 'photo-2',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1WJh5AHQSCVNMcVjp480W8UimOaxqnsH7eZOTomIlqUwDe-8TNFf1ZtdzNqf2LJPAK9aXVdVNcOocL-LQyrBaEhgB288QQNniT0RG_uOtkdhh5FkVhzWZMguPxFoxVgwQwexN6BkYY4uDJg75PoTWEqSANByU5tE3EmkHZJHCAGRLSkpht0QJHZvLqBJpVGOTUSu5FkQ7xvqGMnO7gohMtv2xfqux09DHLLpGr1yhMZmB8pl-7kDWSQQ7jI',
    label: 'Pantry & Espresso',
    isPrimary: false
  },
  {
    id: 'photo-3',
    url: 'https://lh3.googleusercontent.com/aida/AEtjO1XAI5rGyv91tzi7CbmNLFOHIxqpLrazL0QeDuuuN_yD1NwnUVxHaejPcfn5U9zTUqodjQv05kWI12wAvhUkIOrJ1f1m8UiTvnB7yDjNl_MbF0XZRpiZdpFeF4JMAgS7G7csDqrGyOpFU5-YfpLhcfKpdQiB1Ci5SFfb0P9pkMjxRidtRFt87aD_EfxC-U64UZ1RlGO9gJwVoVfWD9A1GQt7oagZ5-Lz-MCTFKHyD43qxGU4OVjnIXMusHs',
    label: 'View from Seat',
    isPrimary: false
  }
];

export const AVAILABLE_AMENITIES: AmenityItem[] = [
  { id: 'amenity-wifi', label: '1 Gbps Fiber WiFi', iconName: 'Wifi' },
  { id: 'amenity-monitors', label: 'Dual 4K Monitors', iconName: 'Monitor' },
  { id: 'amenity-chair', label: 'Herman Miller Chair', iconName: 'Armchair' },
  { id: 'amenity-dock', label: 'USB-C Dock', iconName: 'Zap' },
  { id: 'amenity-wireless-charger', label: 'Wireless Charger', iconName: 'BatteryCharging' },
  { id: 'amenity-sunlight', label: 'Direct Sunlight', iconName: 'Sun' },
  { id: 'amenity-coffee', label: 'Free Barista Coffee', iconName: 'Coffee' },
  { id: 'amenity-soundproof', label: 'Soundproof Partitions', iconName: 'VolumeX' }
];

export const INITIAL_RESOURCE_FORM_DATA: CreateResourceFormData = {
  resourceCode: 'DESK-A12',
  displayName: 'Quiet Executive Focus Desk A-12',
  resourceType: 'DEDICATED_DESK',
  workspaceHub: 'NexSpace Saigon Prime Hub',
  floorLevel: 'Floor 12 — Main Coworking Floor',
  zoneSection: 'Zone A — Quiet Focus Zone (No calls allowed)',
  photos: INITIAL_RESOURCE_PHOTOS,
  capacity: 1,
  specifications:
    'High-focus ergonomic workstation featuring motorized sit-stand desk, Herman Miller Aeron chair, dual 27-inch 4K LG displays with 90W USB-C charging dock, sound-dampening acoustic dividers, and direct natural sunlight.',
  amenities: [
    '1 Gbps Fiber WiFi',
    'Dual 4K Monitors',
    'Herman Miller Chair',
    'USB-C Dock',
    'Wireless Charger',
    'Direct Sunlight',
    'Free Barista Coffee',
    'Soundproof Partitions'
  ],
  hourlyRate: '2.50',
  dailyRate: '18.00',
  instantBooking: true,
  publishLive: true
};

