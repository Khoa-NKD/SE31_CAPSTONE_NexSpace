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
  DayOfWeek
} from '../types/wizard';

const STORAGE_KEY = 'nexspace_organizer_onboarding_draft_v1';

export const INITIAL_BASIC_INFO: BasicInfoValues = {
  name: 'NexSpace Executive Center Saigon',
  category: 'coworking_hub',
  description:
    'Modern, high-connectivity enterprise coworking floor situated in District 1, boasting ergonomic Herman Miller chairs, soundproof phone booths, and high-speed enterprise fiber network.',
  totalArea: 1250,
  contactPhone: '+84 (0) 28 3822 9900',
  contactEmail: 'concierge.prime@nexspace.vn'
};

export const INITIAL_LOCATION: LocationValues = {
  streetAddress: '72 Le Thanh Ton Boulevard',
  district: 'Ben Nghe Ward, District 1',
  city: 'Ho Chi Minh City',
  floorSuite: 'Vincom Center Landmark Tower, Floor 12',
  latitude: 10.7769,
  longitude: 106.7009,
  entryNotes:
    'Parking available in basement B2 & B3 (motorbike & car). Please take High-zone elevator bank B directly to 12th floor reception desk.'
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

export const INITIAL_AMENITIES: string[] = [
  'fast-wifi',
  'phone-booth',
  'screen-casting',
  'dual-monitors',
  'ergonomic-chairs',
  'standing-desks',
  'espresso-bar',
  'filtered-water-tea',
  'smart-lock-247',
  'community-manager',
  'cctv-security',
  'mail-handling'
];

export const INITIAL_MEDIA_GALLERY: MediaGalleryValues = {
  coverPhotoId: 'media-1',
  items: [
    {
      id: 'media-1',
      url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      name: 'Main Open Coworking Floor',
      dimension: '2560 × 1440',
      caption: 'Main Open Coworking',
      isCover: true
    },
    {
      id: 'media-2',
      url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
      name: 'Executive Glass Boardroom',
      dimension: '1920 × 1080',
      caption: 'Executive Glass Boardroom',
      isCover: false
    },
    {
      id: 'media-3',
      url: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',
      name: 'Dedicated Desk Zone',
      dimension: '1920 × 1080',
      caption: 'Dedicated Desk Zone',
      isCover: false
    },
    {
      id: 'media-4',
      url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
      name: 'Specialty Espresso Pantry',
      dimension: '1920 × 1080',
      caption: 'Specialty Espresso Pantry',
      isCover: false
    }
  ]
};

export interface WizardStore extends OnboardingDraftState {
  setBasicInfo: (data: Partial<BasicInfoValues>) => void;
  setLocation: (data: Partial<LocationValues>) => void;
  setCoordinates: (latitude: number, longitude: number) => void;
  setOperatingHours: (data: Partial<OperatingHoursValues>) => void;
  updateDaySchedule: (day: DayOfWeek, updates: Partial<DaySchedule>) => void;
  applyMondayToWeekdays: () => void;
  toggleAmenity: (amenityId: string) => void;
  setAmenities: (amenities: string[]) => void;
  selectCommonAmenities: (commonIds: string[]) => void;
  clearAmenities: () => void;
  setMediaGallery: (data: Partial<MediaGalleryValues>) => void;
  addMediaItem: (item: MediaItem) => void;
  removeMediaItem: (id: string) => void;
  setCoverPhoto: (id: string) => void;
  reorderMediaItems: (fromIndex: number, toIndex: number) => void;
  saveDraft: () => void;
  resetDraft: () => void;
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      version: 1,
      lastSavedAt: new Date().toISOString(),
      isDraftSynced: true,
      basicInfo: INITIAL_BASIC_INFO,
      location: INITIAL_LOCATION,
      operatingHours: INITIAL_OPERATING_HOURS,
      amenities: INITIAL_AMENITIES,
      media: INITIAL_MEDIA_GALLERY,

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
          amenities: []
        })),

      setMediaGallery: (data) =>
        set((state) => ({
          isDraftSynced: false,
          media: { ...state.media, ...data }
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

      saveDraft: () =>
        set(() => ({
          lastSavedAt: new Date().toISOString(),
          isDraftSynced: true
        })),

      resetDraft: () =>
        set(() => ({
          version: 1,
          lastSavedAt: new Date().toISOString(),
          isDraftSynced: true,
          basicInfo: INITIAL_BASIC_INFO,
          location: INITIAL_LOCATION,
          operatingHours: INITIAL_OPERATING_HOURS,
          amenities: INITIAL_AMENITIES,
          media: INITIAL_MEDIA_GALLERY
        }))
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
      merge: (persistedState: unknown, currentState: WizardStore) => {
        const p = persistedState as Partial<WizardStore> | undefined;
        if (!p) return currentState;
        return {
          ...currentState,
          ...p,
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
            ...currentState.media,
            ...p.media,
            items: p.media?.items?.length ? p.media.items : currentState.media.items
          }
        };
      }
    }
  )
);
