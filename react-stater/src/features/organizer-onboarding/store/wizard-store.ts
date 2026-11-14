import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  BasicInfoValues,
  LocationValues,
  OperatingHoursValues,
  MediaGalleryValues,
  MediaItem,
  OnboardingDraftState,
  DaySchedule,
  DayOfWeek,
  FloorItem,
  ZoneItem,
  FloorPlanValues
} from '../types/wizard';
import type { CanonicalWorkspace } from '@/features/workspaces/api/types';
import { mapCanonicalToWizardState } from '../utils/wizard-api-mapper';

const STORAGE_KEY = 'nexspace_organizer_onboarding_draft_v1';

export const INITIAL_BASIC_INFO: BasicInfoValues = {
  name: '',
  category: 'coworking_hub',
  description: '',
  totalArea: 0,
  contactPhone: '',
  contactEmail: ''
};

export const INITIAL_LOCATION: LocationValues = {
  streetAddress: '',
  district: '',
  city: '',
  floorSuite: '',
  latitude: null,
  longitude: null,
  entryNotes: ''
};

export const INITIAL_SCHEDULE: DaySchedule[] = [
  { day: 'monday', label: 'Monday', isOpen: true, openTime: '08:00 AM', closeTime: '10:00 PM' },
  { day: 'tuesday', label: 'Tuesday', isOpen: true, openTime: '08:00 AM', closeTime: '10:00 PM' },
  { day: 'wednesday', label: 'Wednesday', isOpen: true, openTime: '08:00 AM', closeTime: '10:00 PM' },
  { day: 'thursday', label: 'Thursday', isOpen: true, openTime: '08:00 AM', closeTime: '10:00 PM' },
  { day: 'friday', label: 'Friday', isOpen: true, openTime: '08:00 AM', closeTime: '10:00 PM' },
  { day: 'saturday', label: 'Saturday', isOpen: true, openTime: '09:00 AM', closeTime: '06:00 PM' },
  { day: 'sunday', label: 'Sunday', isOpen: false, openTime: '09:00 AM', closeTime: '05:00 PM' }
];

export const INITIAL_OPERATING_HOURS: OperatingHoursValues = {
  is247: false,
  schedule: INITIAL_SCHEDULE,
  blockHolidays: true,
  allowGracePeriod: false
};

export const INITIAL_AMENITIES: string[] = [];

export const INITIAL_MEDIA_GALLERY: MediaGalleryValues = {
  coverPhotoId: '',
  items: []
};

export const INITIAL_FLOORS: FloorItem[] = [
  {
    id: 'floor-12',
    number: 12,
    name: 'Floor 12 — Main Coworking Floor',
    subtitle: '540 m² Usable • 74 Capacity',
    usableAreaSqm: 540,
    capacity: 74,
    status: 'active'
  },
  {
    id: 'floor-11',
    number: 11,
    name: 'Floor 11 — Office Suites',
    subtitle: '480 m² Usable • 52 Capacity',
    usableAreaSqm: 480,
    capacity: 52,
    status: 'active'
  },
  {
    id: 'floor-14',
    number: 14,
    name: 'Floor 14 — Executive Terrace & Lounge',
    subtitle: '320 m² Usable • 40 Capacity',
    usableAreaSqm: 320,
    capacity: 40,
    status: 'draft'
  }
];

export const INITIAL_ZONES: ZoneItem[] = [
  {
    id: 'zone-a',
    name: 'Zone A — Quiet Focus',
    code: 'ZA-12',
    floorId: 'floor-12',
    type: 'quiet_focus',
    color: '#3B82F6',
    baseHourlyRate: 2.5,
    areaSqm: 240,
    capacity: 28,
    occupiedCount: 18,
    amenities: ['Acoustic Baffles', 'Ergonomic Chairs', 'Silent Policy'],
    polygonPoints: '20,30 220,30 220,490 20,490'
  },
  {
    id: 'zone-b',
    name: 'Zone B — Team Hub',
    code: 'ZB-12',
    floorId: 'floor-12',
    type: 'team_hub',
    color: '#F59E0B',
    baseHourlyRate: 3.0,
    areaSqm: 180,
    capacity: 16,
    occupiedCount: 14,
    amenities: ['Whiteboards', 'Monitor Arms', 'Collaboration Lounge'],
    polygonPoints: '240,30 520,30 520,490 240,490'
  },
  {
    id: 'zone-c',
    name: 'Zone C — Executive Meeting Suites',
    code: 'ZC-12',
    floorId: 'floor-12',
    type: 'meeting_suite',
    color: '#8B5CF6',
    baseHourlyRate: 15.0,
    areaSqm: 120,
    capacity: 30,
    occupiedCount: 30,
    amenities: ['4K Video Conferencing', 'Acoustic Glass', 'Executive Credenza'],
    polygonPoints: '540,30 830,30 830,490 540,490'
  }
];

export const INITIAL_FLOOR_PLAN: FloorPlanValues = {
  selectedFloorId: 'floor-12',
  floors: INITIAL_FLOORS,
  zones: INITIAL_ZONES,
  gridSnap: true,
  showDimensions: false,
  zoomLevel: 100
};

export interface WizardStore extends OnboardingDraftState {
  setBasicInfo: (data: Partial<BasicInfoValues>) => void;
  setLocation: (data: Partial<LocationValues>) => void;
  setCoordinates: (latitude: number | null, longitude: number | null) => void;
  setOperatingHours: (data: Partial<OperatingHoursValues>) => void;
  updateDaySchedule: (day: DayOfWeek, updates: Partial<DaySchedule>) => void;
  applyMondayToWeekdays: () => void;
  toggleAmenity: (amenityId: string) => void;
  setAmenityAddonRate: (amenityId: string, rate: number) => void;
  setAmenities: (amenities: string[]) => void;
  selectCommonAmenities: (commonIds: string[]) => void;
  clearAmenities: () => void;
  setMediaGallery: (data: Partial<MediaGalleryValues>) => void;
  clearMedia: () => void;
  setIsEditMode: (isEdit: boolean) => void;
  addMediaItem: (item: MediaItem) => void;
  updateMediaItem: (id: string, updates: Partial<MediaItem>) => void;
  removeMediaItem: (id: string) => void;
  setCoverPhoto: (id: string) => void;
  reorderMediaItems: (fromIndex: number, toIndex: number) => void;
  setSelectedFloor: (floorId: string) => void;
  addFloor: (floor: FloorItem) => void;
  updateFloor: (id: string, updates: Partial<FloorItem>) => void;
  removeFloor: (id: string) => void;
  addZone: (zone: ZoneItem) => void;
  updateZone: (id: string, updates: Partial<ZoneItem>) => void;
  removeZone: (id: string) => void;
  setFloorPlanSettings: (settings: Partial<Pick<FloorPlanValues, 'gridSnap' | 'showDimensions' | 'zoomLevel'>>) => void;
  setSubmissionStatus: (status: 'draft' | 'under_review' | 'published') => void;
  setCanonicalWorkspace: (id: string, version: number) => void;
  setClientDraftKey: (key: string) => void;
  setServerVersion: (version: number) => void;
  setIsSavingToServer: (saving: boolean) => void;
  setSyncError: (error: string | null) => void;
  markDraftSynced: (isSynced: boolean) => void;
  hydrateFromServer: (workspace: CanonicalWorkspace) => void;
  setWorkspaceStep: (workspaceId: string, route: string) => void;
  saveDraft: () => void;
  resetDraft: () => void;
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      version: 1,
      lastSavedAt: new Date().toISOString(),
      isDraftSynced: true,
      canonicalWorkspaceId: undefined,
      isEditMode: false,
      clientDraftKey: undefined,
      serverVersion: undefined,
      workspaceSteps: {},
      basicInfo: INITIAL_BASIC_INFO,
      location: INITIAL_LOCATION,
      operatingHours: INITIAL_OPERATING_HOURS,
      amenities: INITIAL_AMENITIES,
      amenityAddonRates: {},
      media: INITIAL_MEDIA_GALLERY,
      floorPlan: INITIAL_FLOOR_PLAN,
      submissionStatus: 'draft',

      setWorkspaceStep: (workspaceId, route) =>
        set((state) => ({
          workspaceSteps: {
            ...state.workspaceSteps,
            [workspaceId]: route
          }
        })),

      setBasicInfo: (data) =>
        set((state) => ({
          isDraftSynced: false,
          basicInfo: { ...state.basicInfo, ...data }
        })),

      setLocation: (data) =>
        set((state) => ({
          isDraftSynced: false,
          location: { ...state.location, ...data }
        })),

      setCoordinates: (latitude, longitude) =>
        set((state) => ({
          isDraftSynced: false,
          location: { ...state.location, latitude, longitude }
        })),

      setOperatingHours: (data) =>
        set((state) => ({
          isDraftSynced: false,
          operatingHours: { ...state.operatingHours, ...data }
        })),

      updateDaySchedule: (day, updates) =>
        set((state) => ({
          isDraftSynced: false,
          operatingHours: {
            ...state.operatingHours,
            schedule: state.operatingHours.schedule.map((item) =>
              item.day === day ? { ...item, ...updates } : item
            )
          }
        })),

      applyMondayToWeekdays: () =>
        set((state) => {
          const monday = state.operatingHours.schedule.find((s) => s.day === 'monday');
          if (!monday) return state;

          const weekdays: DayOfWeek[] = ['tuesday', 'wednesday', 'thursday', 'friday'];
          return {
            isDraftSynced: false,
            operatingHours: {
              ...state.operatingHours,
              schedule: state.operatingHours.schedule.map((item) => {
                if (weekdays.includes(item.day)) {
                  return {
                    ...item,
                    isOpen: monday.isOpen,
                    openTime: monday.openTime,
                    closeTime: monday.closeTime
                  };
                }
                return item;
              })
            }
          };
        }),

      toggleAmenity: (amenityId) =>
        set((state) => {
          const exists = state.amenities.includes(amenityId);
          const newAmenities = exists
            ? state.amenities.filter((id) => id !== amenityId)
            : [...state.amenities, amenityId];
          return {
            isDraftSynced: false,
            amenities: newAmenities
          };
        }),

      setAmenityAddonRate: (amenityId, rate) =>
        set((state) => ({
          isDraftSynced: false,
          amenityAddonRates: {
            ...state.amenityAddonRates,
            [amenityId]: Math.max(0, rate)
          }
        })),

      setAmenities: (amenities) =>
        set(() => ({
          isDraftSynced: false,
          amenities
        })),

      selectCommonAmenities: (commonIds) =>
        set((state) => {
          const combined = Array.from(new Set([...state.amenities, ...commonIds]));
          return {
            isDraftSynced: false,
            amenities: combined
          };
        }),

      clearAmenities: () =>
        set(() => ({
          isDraftSynced: false,
          amenities: [],
          amenityAddonRates: {}
        })),

      setMediaGallery: (data) =>
        set((state) => ({
          isDraftSynced: false,
          media: { ...state.media, ...data }
        })),

      clearMedia: () =>
        set(() => ({
          isDraftSynced: false,
          media: { coverPhotoId: '', items: [] }
        })),

      setIsEditMode: (isEdit) =>
        set(() => ({
          isEditMode: isEdit
        })),

      addMediaItem: (item) =>
        set((state) => {
          const isFirst = state.media.items.length === 0;
          const newItem: MediaItem = {
            ...item,
            isCover: isFirst ? true : item.isCover
          };
          const newItems = [...state.media.items, newItem];
          return {
            isDraftSynced: false,
            media: {
              ...state.media,
              items: newItems,
              coverPhotoId: isFirst ? newItem.id : state.media.coverPhotoId
            }
          };
        }),

      updateMediaItem: (id, updates) =>
        set((state) => ({
          isDraftSynced: false,
          media: {
            ...state.media,
            items: state.media.items.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            )
          }
        })),

      removeMediaItem: (id) =>
        set((state) => {
          const filtered = state.media.items.filter((item) => item.id !== id);
          let newCoverId = state.media.coverPhotoId;
          if (newCoverId === id) {
            newCoverId = filtered[0]?.id || '';
          }
          const updatedItems = filtered.map((item) => ({
            ...item,
            isCover: item.id === newCoverId
          }));
          return {
            isDraftSynced: false,
            media: {
              ...state.media,
              items: updatedItems,
              coverPhotoId: newCoverId
            }
          };
        }),

      setCoverPhoto: (id) =>
        set((state) => ({
          isDraftSynced: false,
          media: {
            ...state.media,
            coverPhotoId: id,
            items: state.media.items.map((item) => ({
              ...item,
              isCover: item.id === id
            }))
          }
        })),

      reorderMediaItems: (fromIndex, toIndex) =>
        set((state) => {
          if (
            fromIndex < 0 ||
            fromIndex >= state.media.items.length ||
            toIndex < 0 ||
            toIndex >= state.media.items.length ||
            fromIndex === toIndex
          ) {
            return state;
          }
          const newItems = [...state.media.items];
          const [moved] = newItems.splice(fromIndex, 1);
          newItems.splice(toIndex, 0, moved);
          return {
            isDraftSynced: false,
            media: {
              ...state.media,
              items: newItems
            }
          };
        }),

      setSelectedFloor: (floorId) =>
        set((state) => ({
          isDraftSynced: false,
          floorPlan: {
            ...state.floorPlan,
            selectedFloorId: floorId
          }
        })),

      addFloor: (floor) =>
        set((state) => ({
          isDraftSynced: false,
          floorPlan: {
            ...state.floorPlan,
            floors: [...state.floorPlan.floors, floor],
            selectedFloorId: floor.id
          }
        })),

      updateFloor: (id, updates) =>
        set((state) => ({
          isDraftSynced: false,
          floorPlan: {
            ...state.floorPlan,
            floors: state.floorPlan.floors.map((f) => (f.id === id ? { ...f, ...updates } : f))
          }
        })),

      removeFloor: (id) =>
        set((state) => {
          const remainingFloors = state.floorPlan.floors.filter((f) => f.id !== id);
          const remainingZones = state.floorPlan.zones.filter((z) => z.floorId !== id);
          const newSelectedId =
            state.floorPlan.selectedFloorId === id
              ? remainingFloors[0]?.id || ''
              : state.floorPlan.selectedFloorId;
          return {
            isDraftSynced: false,
            floorPlan: {
              ...state.floorPlan,
              floors: remainingFloors,
              zones: remainingZones,
              selectedFloorId: newSelectedId
            }
          };
        }),

      addZone: (zone) =>
        set((state) => ({
          isDraftSynced: false,
          floorPlan: {
            ...state.floorPlan,
            zones: [...state.floorPlan.zones, zone]
          }
        })),

      updateZone: (id, updates) =>
        set((state) => ({
          isDraftSynced: false,
          floorPlan: {
            ...state.floorPlan,
            zones: state.floorPlan.zones.map((z) => (z.id === id ? { ...z, ...updates } : z))
          }
        })),

      removeZone: (id) =>
        set((state) => ({
          isDraftSynced: false,
          floorPlan: {
            ...state.floorPlan,
            zones: state.floorPlan.zones.filter((z) => z.id !== id)
          }
        })),

      setFloorPlanSettings: (settings) =>
        set((state) => ({
          floorPlan: {
            ...state.floorPlan,
            ...settings
          }
        })),

      setSubmissionStatus: (status) =>
        set(() => ({
          isDraftSynced: false,
          submissionStatus: status
        })),

      setCanonicalWorkspace: (id, version) =>
        set(() => ({
          canonicalWorkspaceId: id,
          serverVersion: version,
          isDraftSynced: true,
          syncError: null
        })),

      setClientDraftKey: (key) =>
        set(() => ({
          clientDraftKey: key
        })),

      setServerVersion: (version) =>
        set(() => ({
          serverVersion: version,
          isDraftSynced: true
        })),

      setIsSavingToServer: (saving) =>
        set(() => ({
          isSavingToServer: saving
        })),

      setSyncError: (error) =>
        set(() => ({
          syncError: error
        })),

      markDraftSynced: (isSynced) =>
        set(() => ({
          isDraftSynced: isSynced
        })),

      hydrateFromServer: (workspace) =>
        set((state) => {
          const hydrated = mapCanonicalToWizardState(workspace, state);
          return {
            ...state,
            ...hydrated,
            canonicalWorkspaceId: String(workspace.id),
            isEditMode: true,
            serverVersion: workspace.version,
            isDraftSynced: true,
            syncError: null
          };
        }),

      saveDraft: () =>
        set(() => ({
          lastSavedAt: new Date().toISOString()
        })),

      resetDraft: () =>
        set(() => ({
          version: 1,
          lastSavedAt: new Date().toISOString(),
          isDraftSynced: true,
          canonicalWorkspaceId: undefined,
          isEditMode: false,
          clientDraftKey: undefined,
          serverVersion: undefined,
          syncError: null,
          basicInfo: INITIAL_BASIC_INFO,
          location: INITIAL_LOCATION,
          operatingHours: INITIAL_OPERATING_HOURS,
          amenities: INITIAL_AMENITIES,
          media: { coverPhotoId: '', items: [] },
          floorPlan: INITIAL_FLOOR_PLAN,
          submissionStatus: 'draft'
        }))
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persistedState: unknown, currentState: WizardStore) => {
        const p = persistedState as Partial<WizardStore> | undefined;
        if (!p) return currentState;
        // Filter out legacy unsplash mock photos if present
        const persistedItems = (p.media?.items || []).filter(
          (item) => !item.id?.startsWith('media-') || !item.url?.includes('unsplash.com')
        );
        const coverId =
          persistedItems.find((i) => i.id === p.media?.coverPhotoId)?.id ||
          persistedItems[0]?.id ||
          '';
        return {
          ...currentState,
          ...p,
          canonicalWorkspaceId: p.canonicalWorkspaceId ?? currentState.canonicalWorkspaceId,
          isEditMode: p.isEditMode ?? currentState.isEditMode,
          clientDraftKey: p.clientDraftKey ?? currentState.clientDraftKey,
          serverVersion: p.serverVersion ?? currentState.serverVersion,
          isDraftSynced: p.isDraftSynced ?? currentState.isDraftSynced,
          basicInfo: { ...currentState.basicInfo, ...p.basicInfo },
          location: { ...currentState.location, ...p.location },
          operatingHours: {
            ...currentState.operatingHours,
            ...p.operatingHours,
            schedule: p.operatingHours?.schedule?.length
              ? p.operatingHours.schedule
              : currentState.operatingHours.schedule
          },
          amenities: Array.isArray(p.amenities) ? p.amenities : currentState.amenities,
          media: {
            coverPhotoId: coverId,
            items: persistedItems
          },
          floorPlan: {
            ...currentState.floorPlan,
            ...p.floorPlan,
            floors: p.floorPlan?.floors?.length ? p.floorPlan.floors : currentState.floorPlan.floors,
            zones: p.floorPlan?.zones?.length ? p.floorPlan.zones : currentState.floorPlan.zones
          },
          submissionStatus: p.submissionStatus || currentState.submissionStatus
        };
      }
    }
  )
);
