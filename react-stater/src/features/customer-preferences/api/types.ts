export type ResourceCategoryPreference = 'DESK' | 'ROOM' | 'ANY';

export type NoiseLevel = 'QUIET' | 'MODERATE' | 'LIVELY';

export type BookingPurpose =
  | 'STUDY'
  | 'FREELANCE'
  | 'TEAM_WORK'
  | 'MEETING'
  | 'EVENT'
  | 'OTHER';

export interface CustomerPreferenceDto {
  customerId: number;
  districts: string[];
  amenityIds: number[];
  budgetMin: number | null;
  budgetMax: number | null;
  resourceCategory: ResourceCategoryPreference;
  noiseLevel: NoiseLevel | null;
  purpose: BookingPurpose | null;
  updatedAt: string | null;
}

export interface UpdateCustomerPreferencePayload {
  districts?: string[];
  amenityIds?: number[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  resourceCategory?: ResourceCategoryPreference;
  noiseLevel?: NoiseLevel | null;
  purpose?: BookingPurpose | null;
}

