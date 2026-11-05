import { backendRequest } from '../../auth/api/session.ts';
import { ApiError } from '../../../lib/api-client.ts';
import { z } from 'zod';

// Stable domain codes remain aligned with the backend enum; labels come from the master API.
export const BUSINESS_TYPE_CODES = [
  'JOINT_STOCK',
  'LIMITED_LIABILITY',
  'SOLE_PROPRIETOR',
  'HOUSEHOLD_BUSINESS',
  'OTHER'
] as const;

export interface ApplicationInput {
  legalName: string;
  businessType: (typeof BUSINESS_TYPE_CODES)[number];
  taxId: string;
  representativeName: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  registrationReason: string;
}

const optionalText = (max: number) => z.string().trim().max(max);
/** Draft validation permits empty fields, while validating every provided value. */
export const applicationDraftSchema = z.object({
  legalName: optionalText(255),
  businessType: z.enum(BUSINESS_TYPE_CODES),
  taxId: optionalText(50),
  representativeName: optionalText(100),
  address: optionalText(500),
  contactPhone: z
    .string()
    .trim()
    .regex(/^$|^[+0-9() .-]{8,20}$/, 'Enter a valid phone number (8–20 characters)'),
  contactEmail: z
    .string()
    .trim()
    .pipe(z.union([z.literal(''), z.string().email('Enter a valid email address').max(255)])),
  registrationReason: optionalText(2000).default('')
});

/** The reason may be blank while saving, but every explicit submission requires it. */
export const registrationReasonSubmissionSchema = z
  .string()
  .trim()
  .min(1, 'Registration reason is required before submitting.')
  .max(2000, 'Registration reason must not exceed 2,000 characters.');

export interface ApplicationReceipt {
  id: number;
  status: 'PENDING_REVIEW';
  /** ISO local date/time in UTC, matching the backend submission timestamp. */
  submittedAt: string;
}

export interface ApplicationDetails extends Omit<ApplicationReceipt, 'status' | 'submittedAt'> {
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewFeedback?: string | null;
  legalName?: string;
  businessType?: ApplicationInput['businessType'];
  taxId?: string;
  representativeName?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  registrationReason?: string | null;
}

export async function currentApplication(signal?: AbortSignal): Promise<ApplicationDetails | null> {
  try {
    return await backendRequest<ApplicationDetails>(
      '/organizer/applications/current',
      'GET',
      undefined,
      true,
      signal
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function startApplicationDraft(): Promise<ApplicationDetails> {
  return backendRequest<ApplicationDetails>('/organizer/applications/draft', 'POST');
}

export function saveApplicationDraft(input: ApplicationInput): Promise<ApplicationDetails> {
  return backendRequest<ApplicationDetails>('/organizer/applications/draft', 'PUT', input);
}

export function submitApplicationDraft(): Promise<ApplicationReceipt> {
  return backendRequest<ApplicationReceipt>('/organizer/applications/submit', 'POST');
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
