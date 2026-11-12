import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { backendRequest } from '../../auth/api/session.ts';
import type { ApplicationDetails } from '../../organizer-application/api/application.ts';
import type { ApplicationInput } from '../../organizer-application/api/application.ts';

export const adminApplicationSearchSchema = z.object({
  page: z.coerce.number().int().min(1).max(2147483647).catch(1).default(1),
  size: z.coerce.number().int().min(1).max(100).catch(20).default(20),
  search: z.string().trim().max(255).catch('').default(''),
  status: z
    .enum([
      'all',
      'PENDING_REVIEW',
      'CONTRACT_PENDING',
      'APPROVED',
      'REJECTED',
      'REVISION_REQUESTED'
    ])
    .catch('all')
    .default('all'),
  sortBy: z
    .enum(['id', 'legalName', 'submittedAt', 'reviewedAt', 'status'])
    .catch('submittedAt')
    .default('submittedAt'),
  sortDir: z.enum(['asc', 'desc']).catch('desc').default('desc'),
  // Older links may carry appId; this list never opens a detail or review operation.
  appId: z.string().optional()
});
export type AdminApplicationFilters = z.infer<typeof adminApplicationSearchSchema>;

export interface AdminOrganizerApplication {
  suspended?: boolean;
  id: number;
  legalName: string | null;
  businessType: ApplicationInput['businessType'] | null;
  applicantId: number;
  applicantUserName: string;
  applicantEmail: string;
  status: ApplicationDetails['status'];
  submittedAt: string;
  reviewedAt?: string | null;
}

export interface AdminOrganizerApplicationsPage {
  listObjects: AdminOrganizerApplication[];
  pageNumber: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function adminApplicationEndpoint(filters: AdminApplicationFilters): string {
  const safe = adminApplicationSearchSchema.parse(filters);
  const query = new URLSearchParams({
    page: String(safe.page),
    size: String(safe.size),
    sortBy: safe.sortBy,
    sortDir: safe.sortDir
  });
  if (safe.search) query.set('search', safe.search);
  if (safe.status !== 'all') query.set('status', safe.status);
  return `/admin/organizer-applications?${query}`;
}

export const adminApplicationKeys = {
  list: (actorId: number, filters: AdminApplicationFilters) =>
    ['admin-organizer-applications', actorId, filters] as const
};

export function adminApplicationsQueryOptions(actorId: number, filters: AdminApplicationFilters) {
  return queryOptions({
    queryKey: adminApplicationKeys.list(actorId, filters),
    queryFn: ({ signal }) =>
      backendRequest<AdminOrganizerApplicationsPage>(
        adminApplicationEndpoint(filters),
        'GET',
        undefined,
        true,
        signal
      ),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true
  });
}
