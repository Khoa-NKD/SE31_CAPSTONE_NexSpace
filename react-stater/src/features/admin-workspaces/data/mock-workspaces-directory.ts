export type WorkspaceStatus = 'pending' | 'active' | 'suspended';

export interface WorkspaceGalleryImage {
  id: string;
  label: string;
  category: string;
  verified: boolean;
  url?: string;
}

export interface WorkspaceDirectoryItem {
  id: string; // e.g. "WS-104"
  name: string;
  facilitySubtitle: string;
  streetAddress: string;
  metroZone: string;
  city: string;
  organizerLegalName: string;
  organizerTaxId: string;
  organizerVerified: boolean;
  capacityDesks: number;
  meetingRooms: number;
  focusPods: number;
  capacityLabel: string;
  rating: number;
  reviewsCount: number;
  status: WorkspaceStatus;
  submittedAt: string;
  submittedTime: string;
  receptionHours: string;
  accessMethod: string;
  operatorContactName: string;
  operatorContactPhone: string;
  geofenceCluster: string;
  coordinates: string;
  tags: string[];
  gallery: WorkspaceGalleryImage[];
  hsmSessionId: string;
  moderatorNotes?: string;
  // Canonical fields for Admin governance
  version?: number;
  reviewStatus?: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  moderationStatus?: 'Normal' | 'Suspended';
  operatingStatus?: 'Active' | 'Inactive' | 'Archived';
  description?: string;
  coverImageUrl?: string;
  usableAreaSqm?: number;
  pricePerHour?: number;
  pricePerDay?: number;
  pricePerMonth?: number | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewFeedback?: string | null;
  suspendedBy?: string | null;
  suspendedAt?: string | null;
  suspendReason?: string | null;
  updatedAt?: string;
  operatingHoursList?: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
    is24Hours: boolean;
  }>;
  floorsList?: Array<{
    id: string;
    name: string;
    floorNumber: number;
    status?: string;
    totalDesks?: number;
    totalRooms?: number;
  }>;
  imagesList?: Array<{
    id: string;
    url: string;
    caption?: string;
    isCover: boolean;
    displayOrder: number;
    mediaType: 'image' | '360_degree';
  }>;
}

/**
 * Maps a canonical workspace record from the REST API to a UI-friendly WorkspaceDirectoryItem.
 */
export function mapCanonicalToDirectoryItem(cw: any): WorkspaceDirectoryItem {
  let status: WorkspaceStatus = 'active';
  if (cw.moderationStatus === 'Suspended') {
    status = 'suspended';
  } else if (cw.reviewStatus === 'Pending') {
    status = 'pending';
  } else if (cw.reviewStatus === 'Approved') {
    status = 'active';
  } else if (cw.reviewStatus === 'Rejected') {
    status = 'suspended';
  }

  const galleryImages: WorkspaceGalleryImage[] = (cw.images || []).map((img: any, idx: number) => ({
    id: img.id || `img-${cw.id}-${idx}`,
    label: img.caption || (img.isCover ? 'Cover Photo' : `Facility View ${idx + 1}`),
    category: img.mediaType === '360_degree' ? '360° Tour' : (img.isCover ? 'Cover Photo' : 'Nomad Space'),
    verified: true,
    url: img.url
  }));

  const coordsString =
    typeof cw.latitude === 'number' && typeof cw.longitude === 'number'
      ? `${cw.latitude.toFixed(4)}° N, ${cw.longitude.toFixed(4)}° E`
      : 'Coordinates Pending';

  const metroZone = cw.district && cw.city ? `${cw.district}, ${cw.city}` : (cw.city || 'Metro Area');

  const formattedDate = cw.submittedAt
    ? new Date(cw.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : (cw.createdAt ? new Date(cw.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 24, 2026');

  const formattedTime = cw.submittedAt
    ? new Date(cw.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC'
    : '08:30 UTC';

  return {
    id: cw.id,
    name: cw.name,
    facilitySubtitle: cw.facilitySubtitle || cw.buildingName || cw.streetAddress,
    streetAddress: cw.streetAddress || 'Address pending',
    metroZone,
    city: cw.city || 'Ho Chi Minh City',
    organizerLegalName: cw.organizerLegalName || 'Acme Coworking VN Co., Ltd',
    organizerTaxId: cw.organizerTaxId || '',
    organizerVerified: cw.organizerVerified ?? true,
    capacityDesks: cw.capacityDesks || 0,
    meetingRooms: cw.meetingRooms || 0,
    focusPods: cw.focusPods || 0,
    capacityLabel: cw.capacityLabel || `${cw.capacityDesks || 0} Desks, ${cw.meetingRooms || 0} Mtgs, ${cw.focusPods || 0} Pods`,
    rating: cw.rating || 4.9,
    reviewsCount: cw.reviewsCount || 48,
    status,
    submittedAt: formattedDate,
    submittedTime: formattedTime,
    receptionHours: cw.receptionHours || '08:00 – 20:00 Weekdays',
    accessMethod: cw.accessMethod || 'Smart QR & PIN Terminal',
    operatorContactName: cw.operatorContactName || 'Operator Reception',
    operatorContactPhone: cw.operatorContactPhone || cw.supportPhone || '+84 28 3822 5588',
    geofenceCluster: `${cw.buildingName || cw.name} Pin • Geofence Validated`,
    coordinates: coordsString,
    tags: Array.isArray(cw.tags) && cw.tags.length > 0 ? cw.tags : (Array.isArray(cw.amenities) && cw.amenities.length > 0 ? cw.amenities : ['WiFi 6', 'Ergonomic Seating']),
    gallery: galleryImages,
    hsmSessionId: `#WS-REG-${cw.id}`,
    moderatorNotes: cw.reviewFeedback || cw.suspendReason || undefined,
    version: cw.version || 1,
    reviewStatus: cw.reviewStatus || 'Draft',
    moderationStatus: cw.moderationStatus || 'Normal',
    operatingStatus: cw.operatingStatus || 'Inactive',
    description: cw.description,
    coverImageUrl: cw.coverImageUrl,
    usableAreaSqm: cw.usableAreaSqm,
    pricePerHour: cw.pricePerHour,
    pricePerDay: cw.pricePerDay,
    pricePerMonth: cw.pricePerMonth,
    reviewedBy: cw.reviewedBy,
    reviewedAt: cw.reviewedAt,
    reviewFeedback: cw.reviewFeedback,
    suspendedBy: cw.suspendedBy,
    suspendedAt: cw.suspendedAt,
    suspendReason: cw.suspendReason,
    updatedAt: cw.updatedAt,
    operatingHoursList: cw.operatingHours,
    floorsList: cw.floors,
    imagesList: cw.images
  };
}

export interface WorkspaceDirectorySummaryKpis {
  totalCount: number;
  pendingReviewCount: number;
  activeCount: number;
  suspendedCount: number;
}

export const MOCK_DIRECTORY_KPIS: WorkspaceDirectorySummaryKpis = {
  totalCount: 618,
  pendingReviewCount: 12,
  activeCount: 584,
  suspendedCount: 22
};

export const INITIAL_WORKSPACE_DIRECTORY: WorkspaceDirectoryItem[] = [
  {
    id: 'WS-104',
    name: 'NexSpace Saigon Prime Hub',
    facilitySubtitle: 'Floor 14, Bitexco Financial Tower',
    streetAddress: '2 Hai Trieu, Ben Nghe Ward, District 1, Ho Chi Minh City',
    metroZone: 'District 1, Ho Chi Minh City',
    city: 'Ho Chi Minh City',
    organizerLegalName: 'Acme Coworking VN Co., Ltd',
    organizerTaxId: '0314889211',
    organizerVerified: true,
    capacityDesks: 54,
    meetingRooms: 4,
    focusPods: 2,
    capacityLabel: '54 Desks, 4 Mtgs, 2 Pods',
    rating: 4.92,
    reviewsCount: 342,
    status: 'pending',
    submittedAt: 'Jan 24, 2026',
    submittedTime: '08:30 UTC',
    receptionHours: '07:00 – 22:00 Weekdays',
    accessMethod: 'RFID & Mobile NFC Active',
    operatorContactName: 'Nguyen Van A (Managing Director)',
    operatorContactPhone: '+84 28 3822 9901',
    geofenceCluster: 'Bitexco Tower Cluster Pin • Geofence Validated',
    coordinates: '10.7719° N, 106.7044° E',
    tags: ['1 Gbps Fiber WiFi 6', 'Soundproof Booths (x6)', 'Ergonomic Herman Miller', 'Specialty Coffee Bar'],
    gallery: [
      { id: 'img-1', label: 'Main Nomad Floor', category: 'Nomad Open Space', verified: true },
      { id: 'img-2', label: 'Suite A - Executive', category: 'Meeting Rooms', verified: true },
      { id: 'img-3', label: 'Booth 06 Acoustic', category: 'Focus Pods', verified: true },
      { id: 'img-4', label: 'Cafe Lounge & Pantry', category: 'Amenities', verified: true },
      { id: 'img-5', label: 'Deep Focus Pod C', category: 'Quiet Area', verified: true }
    ],
    hsmSessionId: '#WS-MRB-2026-X104'
  },
  {
    id: 'WS-108',
    name: 'Hanoi Capital Innovation Lab',
    facilitySubtitle: 'Keangnam Landmark 72, Fl. 21',
    streetAddress: 'Pham Hung, Me Tri, Nam Tu Liem, Hanoi',
    metroZone: 'Nam Tu Liem, Hanoi',
    city: 'Hanoi',
    organizerLegalName: 'V-Ventures Workspace JSC',
    organizerTaxId: '0108849201',
    organizerVerified: true,
    capacityDesks: 80,
    meetingRooms: 6,
    focusPods: 4,
    capacityLabel: '80 Desks, 6 Mtgs, 4 Pods',
    rating: 4.88,
    reviewsCount: 198,
    status: 'pending',
    submittedAt: 'Jan 24, 2026',
    submittedTime: '04:15 UTC',
    receptionHours: '08:00 – 21:00 Daily',
    accessMethod: 'Dynamic QR & Facial ID',
    operatorContactName: 'Tran Thu Ha (Operations Lead)',
    operatorContactPhone: '+84 24 3942 8820',
    geofenceCluster: 'Keangnam Complex • Geofence Validated',
    coordinates: '21.0169° N, 105.7839° E',
    tags: ['High-speed Fiber', '4K Video Conference', 'Podcast Studio'],
    gallery: [
      { id: 'img-21', label: 'Open Workspace Loft', category: 'Nomad Space', verified: true },
      { id: 'img-22', label: 'Conference Hall Keangnam', category: 'Events', verified: true },
      { id: 'img-23', label: 'Silent Pod Room', category: 'Quiet Area', verified: true }
    ],
    hsmSessionId: '#WS-MRB-2026-X108'
  },
  {
    id: 'WS-092',
    name: 'Da Nang Marina Tech Collective',
    facilitySubtitle: 'Riverside Tower, Fl. 4',
    streetAddress: '36 Bach Dang, Hai Chau 1, Hai Chau, Da Nang',
    metroZone: 'Hai Chau, Da Nang',
    city: 'Da Nang',
    organizerLegalName: 'Danang Coastal Hubs Ltd.',
    organizerTaxId: '0401994822',
    organizerVerified: true,
    capacityDesks: 35,
    meetingRooms: 2,
    focusPods: 2,
    capacityLabel: '35 Desks, 2 Mtgs, 2 Pods',
    rating: 4.95,
    reviewsCount: 142,
    status: 'active',
    submittedAt: 'Jan 18, 2026',
    submittedTime: '11:20 UTC',
    receptionHours: '08:00 – 20:00 Weekdays',
    accessMethod: 'Mobile NFC Pass',
    operatorContactName: 'David Kim (Community Manager)',
    operatorContactPhone: '+84 236 388 9200',
    geofenceCluster: 'Bach Dang Riverfront • Geofence Validated',
    coordinates: '16.0678° N, 108.2208° E',
    tags: ['Ocean View Lounge', '1 Gbps Dedicated Line', 'Rooftop Terrace'],
    gallery: [
      { id: 'img-31', label: 'Han River View Desks', category: 'Open Space', verified: true },
      { id: 'img-32', label: 'Workshop Room 1', category: 'Meeting Rooms', verified: true }
    ],
    hsmSessionId: '#WS-MRB-2026-X092'
  },
  {
    id: 'WS-115',
    name: 'Thao Dien Creative Haven',
    facilitySubtitle: 'Villa 18, Nguyen Van Huong',
    streetAddress: '18 Nguyen Van Huong, Thao Dien, Thu Duc City, HCMC',
    metroZone: 'Thu Duc City, Ho Chi Minh City',
    city: 'Ho Chi Minh City',
    organizerLegalName: 'Saigon Creative Spaces Ltd.',
    organizerTaxId: '0315582991',
    organizerVerified: true,
    capacityDesks: 42,
    meetingRooms: 3,
    focusPods: 1,
    capacityLabel: '42 Desks, 3 Mtgs, 1 Pod',
    rating: 4.82,
    reviewsCount: 220,
    status: 'active',
    submittedAt: 'Jan 12, 2026',
    submittedTime: '09:00 UTC',
    receptionHours: '24/7 Unmanned Smart Access',
    accessMethod: 'Smart Lock Bluetooth & RFID',
    operatorContactName: 'Elena Rostova (Hub Host)',
    operatorContactPhone: '+84 28 3744 1920',
    geofenceCluster: 'Thao Dien Villa Compound • Geofence Validated',
    coordinates: '10.8032° N, 106.7329° E',
    tags: ['Garden Patio', 'Pet Friendly', '24/7 Access', 'Artisanal Coffee'],
    gallery: [
      { id: 'img-41', label: 'Garden Courtyard Desks', category: 'Outdoor', verified: true },
      { id: 'img-42', label: 'Private Studio 04', category: 'Suites', verified: true }
    ],
    hsmSessionId: '#WS-MRB-2026-X115'
  },
  {
    id: 'WS-120',
    name: 'Westlake Executive Suites',
    facilitySubtitle: 'FL 8, Westlake Point',
    streetAddress: '68 Xuan Dieu, Quang An, Tay Ho, Hanoi',
    metroZone: 'Tay Ho, Hanoi',
    city: 'Hanoi',
    organizerLegalName: 'Capital Real Estate VN LLC',
    organizerTaxId: '0106482910',
    organizerVerified: false,
    capacityDesks: 65,
    meetingRooms: 5,
    focusPods: 3,
    capacityLabel: '65 Desks, 5 Mtgs, 3 Pods',
    rating: 4.76,
    reviewsCount: 88,
    status: 'suspended',
    submittedAt: 'Jan 05, 2026',
    submittedTime: '15:40 UTC',
    receptionHours: '08:00 – 19:00 Weekdays',
    accessMethod: 'Keycard Reception',
    operatorContactName: 'Le Quang Huy (Property Director)',
    operatorContactPhone: '+84 24 3719 5500',
    geofenceCluster: 'Tay Ho Water Edge • Geofence Validated',
    coordinates: '21.0642° N, 105.8277° E',
    tags: ['Lake View', 'Boardroom', 'Concierge Service'],
    gallery: [
      { id: 'img-51', label: 'Boardroom Westlake', category: 'Meeting Rooms', verified: false }
    ],
    hsmSessionId: '#WS-MRB-2026-X120',
    moderatorNotes: 'Suspended pending operator clarification.'
  },
  {
    id: 'WS-128',
    name: 'District 1 TechSpace — Creative Pod B',
    facilitySubtitle: 'Floor 5, 42 Nguyen Hue',
    streetAddress: '42 Nguyen Hue Walking Street, Ben Nghe, District 1, HCMC',
    metroZone: 'District 1, Ho Chi Minh City',
    city: 'Ho Chi Minh City',
    organizerLegalName: 'District 1 Creative Spaces Ltd',
    organizerTaxId: '0319204821',
    organizerVerified: true,
    capacityDesks: 48,
    meetingRooms: 3,
    focusPods: 3,
    capacityLabel: '48 Desks, 3 Mtgs, 3 Pods',
    rating: 4.90,
    reviewsCount: 310,
    status: 'active',
    submittedAt: 'Dec 28, 2025',
    submittedTime: '14:20 UTC',
    receptionHours: '08:00 – 22:00 Daily',
    accessMethod: 'Apple Wallet NFC & QR',
    operatorContactName: 'Marcus Vance (CPTO Supervisor)',
    operatorContactPhone: '+84 28 3821 0042',
    geofenceCluster: 'Nguyen Hue Walking Mall • Geofence Validated',
    coordinates: '10.7745° N, 106.7032° E',
    tags: ['Walking Street View', 'Dedicated Leased Line', 'Gaming Lounge'],
    gallery: [
      { id: 'img-61', label: 'Walking Street View Desks', category: 'Nomad Open Space', verified: true },
      { id: 'img-62', label: 'Soundproof Pod B', category: 'Focus Pods', verified: true }
    ],
    hsmSessionId: '#WS-MRB-2026-X128'
  }
];
