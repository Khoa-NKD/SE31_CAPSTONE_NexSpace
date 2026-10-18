import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BasicInfoValues, LocationValues, OnboardingDraftState } from '../types/wizard';

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

interface WizardStore extends OnboardingDraftState {
  setBasicInfo: (data: Partial<BasicInfoValues>) => void;
  setLocation: (data: Partial<LocationValues>) => void;
  setCoordinates: (latitude: number, longitude: number) => void;
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
          location: INITIAL_LOCATION
        }))
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1
    }
  )
);
