import { queryOptions } from '@tanstack/react-query';
import { backendRequest } from '@/features/auth/api/session';
import type { OrganizerContract } from './contract';

export interface ContractAddendum {
  id: number;
  number: string;
  contractNumber: string;
  status: 'PENDING_SIGNATURE' | 'SIGNED';
  content: string;
  contentHash: string;
  issuedAt: string;
  signedAt: string | null;
  otpExpiresAt: string | null;
  resendAvailableAt: string | null;
  maskedEmail: string;
  canSign: boolean;
}
function path(applicationId?: string) {
  if (applicationId && !/^[1-9]\d*$/.test(applicationId)) throw new Error('Invalid application ID');
  return applicationId
    ? `/admin/organizer-applications/${applicationId}/contract/addenda`
    : '/organizer/contract/addenda';
}
export const addendaOptions = (actorId: number, applicationId?: string) =>
  queryOptions({
    queryKey: ['organizer-contract-addenda', actorId, applicationId ?? 'owner'],
    queryFn: ({ signal }) =>
      backendRequest<ContractAddendum[]>(path(applicationId), 'GET', undefined, true, signal),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true
  });
export const issueAddendum = (applicationId: string, contract: OrganizerContract) =>
  backendRequest<ContractAddendum>(path(applicationId), 'POST', {
    contractId: contract.id,
    contentHash: contract.contentHash
  });
export const requestAddendumOtp = (item: ContractAddendum) =>
  backendRequest<ContractAddendum>('/organizer/contract/addenda/otp', 'POST', {
    addendumId: item.id,
    contentHash: item.contentHash
  });
export const signAddendum = (item: ContractAddendum, otp: string, consent: boolean) =>
  backendRequest<ContractAddendum>('/organizer/contract/addenda/sign', 'POST', {
    addendumId: item.id,
    contentHash: item.contentHash,
    otp,
    consent
  });
