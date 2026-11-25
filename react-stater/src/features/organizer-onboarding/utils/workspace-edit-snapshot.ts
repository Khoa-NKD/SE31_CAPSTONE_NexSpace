import type { CanonicalWorkspace } from '@/features/workspaces/api/types';
import type { WorkspaceAmenityDto } from '@/features/amenities/api/types';
import { mapCanonicalToWizardState } from './wizard-api-mapper';
import type { Building } from '@/features/organizer-resources/api/buildings';
import type { OnboardingDraftState } from '../types/wizard';
import { time12To24 } from './wizard-api-mapper';

/** Compare user-visible values, independently of server revisions and upload IDs. */
export function workspaceEditSnapshot(
  state: Pick<
    OnboardingDraftState,
    | 'basicInfo'
    | 'location'
    | 'operatingHours'
    | 'amenities'
    | 'amenityAddonRates'
    | 'media'
    | 'stagedSite'
  >,
  site?: Building | null
) {
  const staged = state.stagedSite;
  return {
    name: state.basicInfo.name,
    description: state.basicInfo.description,
    address: staged?.address ?? site?.address ?? state.location.streetAddress,
    city: staged?.city ?? site?.city ?? state.location.city,
    ward: staged?.ward ?? site?.ward ?? state.location.district,
    latitude: staged?.latitude ?? site?.latitude ?? state.location.latitude,
    longitude: staged?.longitude ?? site?.longitude ?? state.location.longitude,
    floors: (
      staged?.floors ??
      site?.floors.map((f) => ({
        floorNumber: f.floorNumber,
        widthM: f.realWidthM ?? f.width / 60,
        lengthM: f.realLengthM ?? f.height / 60,
        outline: f.outline ?? 'RECTANGULAR',
        cornerRadiusM: f.cornerRadiusM ?? 0
      })) ??
      []
    )
      .map((f) => ({ ...f, cornerRadiusM: f.cornerRadiusM ?? 0 }))
      .sort((a, b) => a.floorNumber - b.floorNumber),
    is247: state.operatingHours.is247,
    holidayCodes: [...(state.operatingHours.holidayCodes ?? [])].sort(),
    schedule: state.operatingHours.schedule.map((d) => ({
      day: d.day,
      isOpen: state.operatingHours.is247 || d.isOpen,
      openTime: state.operatingHours.is247 ? '00:00' : time12To24(d.openTime),
      closeTime: state.operatingHours.is247 ? '00:00' : time12To24(d.closeTime)
    })),
    entryNotes: state.location.entryNotes,
    amenities: [...state.amenities]
      .sort()
      .map((id) => ({ id, rate: state.amenityAddonRates?.[id] ?? 0 })),
    media: state.media.items.map((item) => ({
      url: item.url,
      cover: item.id === state.media.coverPhotoId
    }))
  };
}

export type WorkspaceEditSnapshot = ReturnType<typeof workspaceEditSnapshot>;
export const editValueChanged = (before: unknown, after: unknown) =>
  JSON.stringify(before) !== JSON.stringify(after);

export function snapshotFromServer(
  workspace: CanonicalWorkspace,
  site: Building | null,
  amenities: WorkspaceAmenityDto[],
  media: { id: string | number; url: string; cover?: boolean; isCover?: boolean }[]
) {
  const mapped = mapCanonicalToWizardState(workspace);
  const items = media.map((item) => ({
    id: String(item.id),
    url: item.url,
    name: 'Ảnh không gian',
    isCover: Boolean(item.cover ?? item.isCover)
  }));
  return workspaceEditSnapshot(
    {
      basicInfo: mapped.basicInfo!,
      location: mapped.location!,
      operatingHours: mapped.operatingHours!,
      amenities: amenities.map((a) => String(a.amenityId)),
      amenityAddonRates: Object.fromEntries(
        amenities.map((a) => [String(a.amenityId), a.addonPricePerHour ?? 0])
      ),
      media: { items, coverPhotoId: items.find((i) => i.isCover)?.id ?? items[0]?.id ?? '' }
    },
    site
  );
}
