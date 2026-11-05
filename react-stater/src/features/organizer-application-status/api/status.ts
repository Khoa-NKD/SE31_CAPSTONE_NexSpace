import { queryOptions } from '@tanstack/react-query';
import {
  currentApplication,
  type ApplicationDetails
} from '../../organizer-application/api/application.ts';

export type ApplicationStatus = ApplicationDetails['status'];

export const APPLICATION_STATUS = {
  DRAFT: {
    label: 'Draft',
    description: 'Your application is saved as a draft and has not been submitted for review.'
  },
  PENDING_REVIEW: {
    label: 'Pending review',
    description:
      'Your application is waiting for administrator review. Editing and uploads are unavailable.'
  },
  REVISION_REQUESTED: {
    label: 'Changes requested',
    description:
      'The reviewer has requested corrections. Read the feedback below before taking an available action.'
  },
  APPROVED: { label: 'Approved', description: 'Your organizer application has been approved.' },
  REJECTED: {
    label: 'Rejected',
    description:
      'Your application was rejected. This is a final decision; editing and resubmission are unavailable.'
  }
} as const satisfies Record<ApplicationStatus, { label: string; description: string }>;

export function applicationStatusPresentation(status: ApplicationStatus) {
  return (
    APPLICATION_STATUS[status] ?? {
      label: 'Unknown status',
      description: 'This application status is not supported by this interface.'
    }
  );
}

export function permittedReviewFeedback(application: ApplicationDetails): string | null {
  return application.status === 'REJECTED' || application.status === 'REVISION_REQUESTED'
    ? application.reviewFeedback?.trim() || null
    : null;
}

/** Preserve the backend's UTC local date/time representation without browser-timezone conversion. */
export function applicationTimestamp(value?: string | null): string {
  if (!value) return 'Not available';
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) return 'Not available';
  return `${value.replace('T', ' ')} UTC`;
}

export const applicationStatusKeys = {
  detail: (actorId: number) => ['organizer-application-status', actorId] as const
};

export function applicationStatusQueryOptions(actorId: number) {
  return queryOptions({
    queryKey: applicationStatusKeys.detail(actorId),
    queryFn: ({ signal }) => currentApplication(signal),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: true
  });
}
