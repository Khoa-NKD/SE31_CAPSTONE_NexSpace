import type {
  CanonicalWorkspace,
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceOperatingHour,
  WorkspaceMediaItem,
  WorkspaceFloorSummary,
  WorkspaceCategory
} from '@/features/workspaces/api/types';
import type {
  OnboardingDraftState,
  DayOfWeek,
  DaySchedule,
  MediaItem,
  FloorItem,
  ZoneItem,
  SpaceCategory
} from '../types/wizard';

const DAY_ORDER: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

/**
 * Converts a 12-hour formatted time string (e.g. "08:00 AM", "10:30 PM")
 * into a 24-hour time string ("08:00", "22:30").
 */
export function time12To24(time12: string): string {
  if (!time12) return '08:00';
  const trimmed = time12.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return '08:00';
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const modifier = (match[3] || 'AM').toUpperCase();
  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Converts a 24-hour time string ("08:00", "22:30")
 * into a 12-hour formatted time string ("08:00 AM", "10:30 PM").
 */
export function time24To12(time24: string): string {
  if (!time24) return '08:00 AM';
  const trimmed = time24.trim();
  if (/AM|PM/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '08:00 AM';
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const modifier = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${modifier}`;
}

/**
 * Converts wizard schedule to canonical WorkspaceOperatingHour array.
 */
export function mapWizardScheduleToCanonical(
  schedules: DaySchedule[],
  is247: boolean
): WorkspaceOperatingHour[] {
  return DAY_ORDER.map((dayName, idx) => {
    const dayOfWeek = idx + 1; // 1 = Monday .. 7 = Sunday
    const found = schedules.find((s) => s.day === dayName);
    if (!found) {
      return {
        dayOfWeek,
        openTime: is247 ? '00:00' : '08:00',
        closeTime: is247 ? '23:59' : '20:00',
        isClosed: is247 ? false : dayOfWeek === 7,
        is24Hours: is247
      };
    }

    return {
      dayOfWeek,
      openTime: is247 ? '00:00' : time12To24(found.openTime),
      closeTime: is247 ? '23:59' : time12To24(found.closeTime),
      isClosed: is247 ? false : !found.isOpen,
      is24Hours: is247
    };
  });
}

/**
 * Converts canonical WorkspaceOperatingHour array back to wizard DaySchedule array.
 */
export function mapCanonicalScheduleToWizard(hours: WorkspaceOperatingHour[]): DaySchedule[] {
  return DAY_ORDER.map((dayName, idx) => {
    const dayOfWeek = idx + 1;
    const hourItem = hours?.find((h) => h.dayOfWeek === dayOfWeek);
    const label = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    if (!hourItem) {
      return {
        day: dayName,
        label,
        isOpen: dayOfWeek !== 7,
        openTime: '08:00 AM',
        closeTime: '08:00 PM'
      };
    }

    return {
      day: dayName,
      label,
      isOpen: hourItem.is24Hours || !hourItem.isClosed,
      openTime: time24To12(hourItem.openTime),
      closeTime: time24To12(hourItem.closeTime)
    };
  });
}

export function isDurableMediaUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/api/v1/media/')) {
    const filename = trimmed.replace('/api/v1/media/', '').trim();
    return Boolean(filename && !filename.includes('..') && /^[a-zA-Z0-9_.-]+$/.test(filename));
  }
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Maps durable wizard media items to canonical API format.
 * NOTE: Temporary browser blob: URLs are strictly excluded from server persistence.
 * Durable remote URLs (http://, https://) and local development media URLs (/api/v1/media/...) are preserved.
 */
export function mapWizardMediaToCanonical(
  items: MediaItem[],
  coverPhotoId: string = ''
): { coverImageUrl: string; images: WorkspaceMediaItem[] } {
  // Only persist durable HTTP/HTTPS or local mock media URLs to the server
  const durableItems = items.filter((item) => isDurableMediaUrl(item.url));

  const images: WorkspaceMediaItem[] = durableItems.map((item, index) => ({
    id: item.id,
    url: item.url,
    caption: item.caption || item.name,
    isCover: item.id === coverPhotoId || item.isCover,
    displayOrder: index + 1,
    mediaType: 'image'
  }));

  const coverItem = durableItems.find((i) => i.id === coverPhotoId) || durableItems[0];
  const coverImageUrl = coverItem?.url || '';

  return { coverImageUrl, images };
}

/**
 * Maps wizard floor plan data into workspace-level summary fields.
 */
export function mapWizardFloorPlanToCanonical(
  floors: FloorItem[],
  zones: ZoneItem[]
): {
  totalFloors: number;
  capacityDesks: number;
  meetingRooms: number;
  focusPods: number;
  capacityLabel: string;
  floors: WorkspaceFloorSummary[];
  pricePerHour: number;
} {
  const totalFloors = Math.max(1, floors.length);
  const totalCapacityFromZones = zones.reduce((sum, z) => sum + (Number(z.capacity) || 0), 0);
  const totalCapacityFromFloors = floors.reduce((sum, f) => sum + (Number(f.capacity) || 0), 0);
  const capacityDesks = totalCapacityFromZones > 0 ? totalCapacityFromZones : totalCapacityFromFloors;

  const meetingRooms = zones.filter((z) => z.type === 'meeting_suite').length;
  const focusPods = zones.filter((z) => z.type === 'quiet_focus').length;

  const summaryFloors: WorkspaceFloorSummary[] = floors.map((f) => ({
    id: f.id,
    name: f.name,
    floorNumber: f.number,
    status: f.status === 'active' ? 'Published' : 'Draft',
    totalDesks: f.capacity,
    totalRooms: zones.filter((z) => z.floorId === f.id && z.type === 'meeting_suite').length
  }));

  // Derive hourly rate from primary zone or reasonable default
  const rates = zones.map((z) => z.baseHourlyRate).filter((r) => typeof r === 'number' && r > 0);
  const pricePerHour = rates.length > 0 ? Math.min(...rates) : 2.5;

  return {
    totalFloors,
    capacityDesks,
    meetingRooms,
    focusPods,
    capacityLabel: `${capacityDesks} Desks, ${meetingRooms} Mtgs`,
    floors: summaryFloors,
    pricePerHour
  };
}

/**
 * Builds a CreateWorkspaceDto from current wizard draft state.
 */
export function mapWizardStateToCreateDto(
  state: OnboardingDraftState,
  organizerId: string = 'USR-9432'
): CreateWorkspaceDto {
  const { coverImageUrl: _coverImageUrl, images: _images } = mapWizardMediaToCanonical(
    state.media.items,
    state.media.coverPhotoId
  );
  const floorPlanMeta = mapWizardFloorPlanToCanonical(
    state.floorPlan.floors,
    state.floorPlan.zones
  );
  const operatingHours = mapWizardScheduleToCanonical(
    state.operatingHours.schedule,
    state.operatingHours.is247
  );

  return {
    name: state.basicInfo.name || 'Untitled Workspace Draft',
    category: (state.basicInfo.category as WorkspaceCategory) || 'coworking_hub',
    streetAddress: state.location.streetAddress || 'Address Pending',
    city: state.location.city || 'Ho Chi Minh City',
    district: state.location.district || 'District 1',
    buildingName: state.location.floorSuite || undefined,
    facilitySubtitle: state.location.floorSuite || undefined,
    description: state.basicInfo.description || '',
    usableAreaSqm: state.basicInfo.totalArea || 0,
    supportPhone: state.basicInfo.contactPhone || undefined,
    supportEmail: state.basicInfo.contactEmail || undefined,
    organizerId,
    latitude: state.location.latitude || 10.7719,
    longitude: state.location.longitude || 106.7044,
    amenities: state.amenities || [],
    operatingHours,
    receptionHours: state.operatingHours.is247 ? '24/7 Access' : '08:00 – 20:00 Weekdays',
    clientDraftKey: state.clientDraftKey,
    ...floorPlanMeta
  };
}

/**
 * Builds an UpdateWorkspaceDto from current wizard draft state for PATCH.
 */
export function mapWizardStateToUpdateDto(
  state: OnboardingDraftState,
  expectedVersion?: number
): UpdateWorkspaceDto {
  const { coverImageUrl, images } = mapWizardMediaToCanonical(
    state.media.items,
    state.media.coverPhotoId
  );
  const floorPlanMeta = mapWizardFloorPlanToCanonical(
    state.floorPlan.floors,
    state.floorPlan.zones
  );
  const operatingHours = mapWizardScheduleToCanonical(
    state.operatingHours.schedule,
    state.operatingHours.is247
  );

  const dto: UpdateWorkspaceDto = {
    name: state.basicInfo.name,
    category: state.basicInfo.category as WorkspaceCategory,
    streetAddress: state.location.streetAddress,
    city: state.location.city,
    district: state.location.district,
    buildingName: state.location.floorSuite,
    facilitySubtitle: state.location.floorSuite,
    entryInstructions: state.location.entryNotes,
    description: state.basicInfo.description,
    usableAreaSqm: state.basicInfo.totalArea,
    supportPhone: state.basicInfo.contactPhone,
    supportEmail: state.basicInfo.contactEmail,
    latitude: state.location.latitude,
    longitude: state.location.longitude,
    operatingHours,
    receptionHours: state.operatingHours.is247 ? '24/7 Access' : '08:00 – 20:00 Weekdays',
    autoBlockPublicHolidays: state.operatingHours.blockHolidays,
    checkInLeadMinutes: state.operatingHours.allowGracePeriod ? 15 : 0,
    amenities: state.amenities,
    totalFloors: floorPlanMeta.totalFloors,
    capacityDesks: floorPlanMeta.capacityDesks,
    meetingRooms: floorPlanMeta.meetingRooms,
    focusPods: floorPlanMeta.focusPods,
    capacityLabel: floorPlanMeta.capacityLabel,
    floors: floorPlanMeta.floors,
    pricePerHour: floorPlanMeta.pricePerHour,
    expectedVersion
  };

  if (coverImageUrl) {
    dto.coverImageUrl = coverImageUrl;
  }
  if (images.length > 0) {
    dto.images = images;
  }

  return dto;
}

/**
 * Hydrates wizard draft state from an authoritative canonical server workspace.
 * Preserves local temporary media previews if present.
 */
export function mapCanonicalToWizardState(
  cw: CanonicalWorkspace,
  existingLocalState?: Partial<OnboardingDraftState>
): Partial<OnboardingDraftState> {
  const schedules = mapCanonicalScheduleToWizard(cw.operatingHours);
  const is247 = Boolean(cw.operatingHours?.some((h) => h.is24Hours));

  // Preserve local blob previews if available, otherwise use canonical images
  const serverMediaItems: MediaItem[] = (cw.images || []).map((img) => ({
    id: img.id,
    url: img.url,
    name: img.caption || 'Workspace Photo',
    dimension: 'Standard High-Res',
    caption: img.caption || '',
    isCover: img.isCover || img.url === cw.coverImageUrl
  }));

  const localMedia = existingLocalState?.media?.items || [];
  const localBlobs = localMedia.filter((m) => m.url?.startsWith('blob:'));
  const mergedItems = [...serverMediaItems, ...localBlobs];
  const coverPhotoId =
    mergedItems.find((m) => m.isCover)?.id ||
    mergedItems[0]?.id ||
    cw.coverImageUrl ||
    '';

  return {
    canonicalWorkspaceId: cw.id,
    serverVersion: cw.version,
    isDraftSynced: true,
    lastSavedAt: cw.updatedAt || new Date().toISOString(),
    basicInfo: {
      name: cw.name || existingLocalState?.basicInfo?.name || '',
      category: (cw.category as unknown as SpaceCategory) || existingLocalState?.basicInfo?.category || 'coworking_hub',
      description: cw.description || existingLocalState?.basicInfo?.description || '',
      totalArea: cw.usableAreaSqm || existingLocalState?.basicInfo?.totalArea || 1250,
      contactPhone: cw.supportPhone || cw.operatorContactPhone || existingLocalState?.basicInfo?.contactPhone || '',
      contactEmail: cw.supportEmail || existingLocalState?.basicInfo?.contactEmail || ''
    },
    location: {
      streetAddress: cw.streetAddress || existingLocalState?.location?.streetAddress || '',
      district: cw.district || existingLocalState?.location?.district || '',
      city: cw.city || existingLocalState?.location?.city || '',
      floorSuite: cw.buildingName || cw.facilitySubtitle || existingLocalState?.location?.floorSuite || '',
      latitude: cw.latitude || existingLocalState?.location?.latitude || 10.7769,
      longitude: cw.longitude || existingLocalState?.location?.longitude || 106.7009,
      entryNotes: cw.entryInstructions || existingLocalState?.location?.entryNotes || ''
    },
    operatingHours: {
      is247,
      schedule: schedules.length > 0 ? schedules : existingLocalState?.operatingHours?.schedule || [],
      blockHolidays: cw.autoBlockPublicHolidays ?? true,
      allowGracePeriod: (cw.checkInLeadMinutes || 0) > 0
    },
    amenities: Array.isArray(cw.amenities) && cw.amenities.length > 0 ? cw.amenities : existingLocalState?.amenities || [],
    media: {
      items: mergedItems.length > 0 ? mergedItems : existingLocalState?.media?.items || [],
      coverPhotoId: coverPhotoId || existingLocalState?.media?.coverPhotoId || ''
    },
    submissionStatus:
      cw.reviewStatus === 'Pending'
        ? 'under_review'
        : cw.reviewStatus === 'Approved'
          ? 'published'
          : 'draft'
  };
}
