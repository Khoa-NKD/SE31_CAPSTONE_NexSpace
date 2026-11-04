import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { backendRequest } from '../../auth/api/session.ts';
import { validApplicationId } from '../../admin-organizers/api/application-details.ts';
import type {
  ApplicationDetails,
  ApplicationInput
} from '../../organizer-application/api/application.ts';
import { applicationDraftSchema } from '../../organizer-application/api/application.ts';

/** Corrections are complete submissions; draft rules remain unchanged. */
export const correctionSchema = applicationDraftSchema.superRefine((application, context) => {
  for (const [field, value] of Object.entries(application)) {
    if (!value.trim())
      context.addIssue({ code: 'custom', path: [field], message: 'This field is required.' });
  }
});
import {
  documentFileError,
  type UploadDocumentType
} from '../../organizer-verification-documents/api/documents.ts';

export interface LifecycleContext {
  id: number;
  status: ApplicationDetails['status'];
  revision: number;
  suspended: boolean;
  suspensionReason?: string | null;
  canApprove: boolean;
  canReject: boolean;
  canSuspend: boolean;
  canCorrect: boolean;
  currentDocumentIds: number[];
}
export type ReviewAction = 'approve' | 'reject' | 'suspend';
export type ReviewDecision = {
  action: ReviewAction;
  revision: number;
  reason?: string;
  note?: string;
  documentsConfirmed?: boolean;
  documentIds?: number[];
};
export const lifecycleKeys = {
  admin: (actorId: number, id: string) => ['organizer-lifecycle', 'admin', actorId, id] as const,
  owner: (actorId: number) => ['organizer-lifecycle', 'owner', actorId] as const
};
function adminPath(id: string) {
  if (!validApplicationId(id)) throw new Error('Invalid application ID.');
  return `/admin/organizer-applications/${id}`;
}
export function adminLifecycleQueryOptions(actorId: number, id: string) {
  return queryOptions({
    queryKey: lifecycleKeys.admin(actorId, id),
    queryFn: ({ signal }) =>
      backendRequest<LifecycleContext>(
        `${adminPath(id)}/lifecycle`,
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
export function ownerLifecycle(signal?: AbortSignal) {
  return backendRequest<LifecycleContext>(
    '/organizer/applications/current/lifecycle',
    'GET',
    undefined,
    true,
    signal
  );
}
export function ownerLifecycleQueryOptions(actorId: number) {
  return queryOptions({
    queryKey: lifecycleKeys.owner(actorId),
    queryFn: ({ signal }) => ownerLifecycle(signal),
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true
  });
}
function revision(value: number) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error('Reload the latest application revision.');
}
export function reviewPayload(decision: ReviewDecision) {
  revision(decision.revision);
  if (decision.action === 'approve') {
    if (!decision.documentsConfirmed || !decision.documentIds?.length)
      throw new Error('Confirm that you have reviewed all current documents.');
    if ((decision.note?.trim().length || 0) > 500)
      throw new Error('Review note must not exceed 500 characters.');
    return {
      revision: decision.revision,
      documentsConfirmed: true,
      documentIds: decision.documentIds,
      note: decision.note?.trim() || null
    };
  }
  const reason = decision.reason?.trim();
  if (!reason || reason.length > 500)
    throw new Error('Enter a reason between 1 and 500 characters.');
  return { revision: decision.revision, reason };
}
export function adminReview(id: string, decision: ReviewDecision) {
  if (!['approve', 'reject', 'suspend'].includes(decision.action))
    throw new Error('Unsupported review action.');
  return backendRequest<LifecycleContext>(
    `${adminPath(id)}/${decision.action}`,
    'POST',
    reviewPayload(decision)
  );
}
export function saveCorrection(revisionValue: number, application: ApplicationInput) {
  revision(revisionValue);
  return backendRequest<LifecycleContext>('/organizer/applications/current/correction', 'PUT', {
    revision: revisionValue,
    application
  });
}
export function resubmit(revisionValue: number) {
  revision(revisionValue);
  return backendRequest<LifecycleContext>('/organizer/applications/current/resubmit', 'POST', {
    revision: revisionValue
  });
}
export function correctionDocumentPayload(
  revisionValue: number,
  documentType: UploadDocumentType,
  expectedCurrentDocumentId: number | null,
  file: File
) {
  revision(revisionValue);
  if (
    !['BUSINESS_LICENSE', 'ID_CARD_FRONT', 'ID_CARD_BACK', 'TAX_CERTIFICATE', 'OTHER'].includes(
      documentType
    )
  )
    throw new Error('Unsupported document type.');
  const error = documentFileError(file);
  if (error) throw new Error(error);
  const data = new FormData();
  data.append('revision', String(revisionValue));
  data.append('documentType', documentType);
  if (expectedCurrentDocumentId !== null) {
    if (!Number.isSafeInteger(expectedCurrentDocumentId) || expectedCurrentDocumentId < 1)
      throw new Error('Invalid current document ID.');
    data.append('expectedCurrentDocumentId', String(expectedCurrentDocumentId));
  }
  data.append('file', file);
  return data;
}
export function correctDocument(
  revisionValue: number,
  type: UploadDocumentType,
  currentId: number | null,
  file: File
) {
  return backendRequest<LifecycleContext>(
    '/organizer/applications/current/correction-documents',
    'POST',
    correctionDocumentPayload(revisionValue, type, currentId, file)
  );
}
export async function invalidateLifecycle(client: QueryClient) {
  await Promise.all(
    [
      'organizer-lifecycle',
      'admin-organizer-applications',
      'admin-organizer-application-details',
      'organizer-application-status',
      'organizer-verification-documents',
      'organizer-business-profile'
    ].map((name) => client.invalidateQueries({ queryKey: [name] }))
  );
}
export function reviewMutationOptions(client: QueryClient, id: string) {
  return {
    mutationFn: (decision: ReviewDecision) => adminReview(id, decision),
    onSuccess: () => invalidateLifecycle(client)
  };
}
