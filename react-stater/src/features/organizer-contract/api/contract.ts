import { queryOptions } from '@tanstack/react-query';
import { backendRequest } from '../../auth/api/session.ts';
import { useAuthStore } from '../../auth/store/auth-store.ts';
import { ApiError } from '../../../lib/api-client.ts';

export interface OrganizerContract {
  id: number;
  contractNumber: string;
  templateVersion: string;
  status: 'PENDING_SIGNATURE' | 'SIGNED' | 'VOIDED';
  demo: boolean;
  content: string;
  contentHash: string;
  issuedAt: string | null;
  signedAt: string | null;
  otpExpiresAt: string | null;
  resendAvailableAt: string | null;
  maskedEmail: string;
  canSign: boolean;
}

function path(applicationId?: string) {
  if (applicationId && !/^[1-9]\d*$/.test(applicationId)) throw new Error('Invalid application ID');
  return applicationId
    ? `/admin/organizer-applications/${applicationId}/contract`
    : '/organizer/contract';
}

export function contractQueryOptions(actorId: number, applicationId?: string) {
  return queryOptions({
    queryKey: ['organizer-contract', actorId, applicationId ?? 'owner'] as const,
    queryFn: async ({ signal }) => {
      try {
        return await backendRequest<OrganizerContract>(
          path(applicationId),
          'GET',
          undefined,
          true,
          signal
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    gcTime: 0,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true
  });
}

export function requestContractOtp(contract: OrganizerContract) {
  return backendRequest<OrganizerContract>('/organizer/contract/otp', 'POST', {
    contractId: contract.id,
    contentHash: contract.contentHash
  });
}

export function signContract(contract: OrganizerContract, otp: string, consent: boolean) {
  return backendRequest<OrganizerContract>('/organizer/contract/sign', 'POST', {
    contractId: contract.id,
    contentHash: contract.contentHash,
    otp,
    consent
  });
}

/** Private PDF bytes never enter the query cache or local storage. */
export async function fetchContractPdf(
  applicationId?: string,
  signal?: AbortSignal
): Promise<Blob> {
  const session = useAuthStore.getState();
  const token = session.accessToken;
  if (!token) throw new Error('Sign in to view this agreement.');
  const response = await fetch(
    `${import.meta.env.VITE_BACKEND_API_URL || '/api'}${path(applicationId)}/pdf`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error'
    }
  );
  if (!response.ok) throw new Error('Could not load the agreement. Refresh and try again.');
  if (response.headers.get('content-type')?.split(';')[0] !== 'application/pdf')
    throw new Error('Unexpected agreement format.');
  const blob = await response.blob();
  if (
    useAuthStore.getState().accessToken !== token ||
    useAuthStore.getState().user?.id !== session.user?.id
  )
    throw new Error('Your session changed. Reopen the agreement.');
  if (
    !blob.size ||
    blob.size > 5 * 1024 * 1024 ||
    new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer()) !== '%PDF-'
  )
    throw new Error('The agreement PDF is invalid.');
  return blob;
}
