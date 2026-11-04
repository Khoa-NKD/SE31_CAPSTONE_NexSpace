import { queryOptions } from '@tanstack/react-query';
import { backendRequest } from '../../auth/api/session.ts';
import { ApiError } from '../../../lib/api-client.ts';
import type { AdminOrganizerApplication } from './applications.ts';
import type { VerificationDocument } from '../../organizer-verification-documents/api/documents.ts';

export interface AdminOrganizerDocument extends VerificationDocument {
  current: boolean;
  adminFeedback?: string | null;
}

export interface AdminOrganizerApplicationDetails {
  id: number;
  legalName?: string | null;
  businessType?: AdminOrganizerApplication['businessType'];
  taxId?: string | null;
  representativeName?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  applicant: { id: number; userName: string; email: string; fullName: string };
  status: AdminOrganizerApplication['status'];
  submittedAt: string;
  reviewedAt?: string | null;
  reviewFeedback?: string | null;
  documents: AdminOrganizerDocument[];
}

/** Validate decimal Long IDs as strings so deep links never lose integer precision. */
export function validApplicationId(id: string): boolean {
  return /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n;
}

export function adminApplicationDetailsEndpoint(id: string): string {
  if (!validApplicationId(id))
    throw new ApiError(400, 'Bad Request', {
      message: 'Application ID must be a positive integer.'
    });
  return `/admin/organizer-applications/${id}`;
}

export const adminApplicationDetailsKeys = {
  detail: (actorId: number, id: string) =>
    ['admin-organizer-application-details', actorId, id] as const
};

export function adminApplicationDetailsQueryOptions(actorId: number, id: string) {
  return queryOptions({
    queryKey: adminApplicationDetailsKeys.detail(actorId, id),
    queryFn: ({ signal }) =>
      backendRequest<AdminOrganizerApplicationDetails>(
        adminApplicationDetailsEndpoint(id),
        'GET',
        undefined,
        true,
        signal
      ),
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false
  });
}
