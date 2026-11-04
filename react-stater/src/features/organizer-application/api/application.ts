import { backendRequest } from '../../auth/api/session.ts';

export const BUSINESS_TYPES = [
  ['JOINT_STOCK', 'Joint stock company'],
  ['LIMITED_LIABILITY', 'Limited liability company'],
  ['SOLE_PROPRIETOR', 'Sole proprietor'],
  ['HOUSEHOLD_BUSINESS', 'Household business'],
  ['OTHER', 'Other business']
] as const;

export interface ApplicationInput {
  legalName: string;
  businessType: (typeof BUSINESS_TYPES)[number][0];
  taxId: string;
  representativeName: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
}

export interface ApplicationReceipt {
  id: number;
  status: 'PENDING_REVIEW';
  /** ISO local date/time in UTC, matching the backend submission timestamp. */
  submittedAt: string;
}

export function applicationPayload(input: ApplicationInput, license: File): FormData {
  const data = new FormData();
  data.append('application', new Blob([JSON.stringify(input)], { type: 'application/json' }));
  data.append('businessLicense', license);
  return data;
}

export function submitApplication(
  input: ApplicationInput,
  license: File
): Promise<ApplicationReceipt> {
  return backendRequest<ApplicationReceipt>(
    '/organizer/applications',
    'POST',
    applicationPayload(input, license)
  );
}
