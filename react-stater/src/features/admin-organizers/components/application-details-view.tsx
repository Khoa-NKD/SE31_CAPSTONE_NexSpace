import {
  ArrowLeft,
  RefreshCw,
  ClipboardList,
  Building2,
  UserRound,
  Files,
  MessageSquare,
  Clock3
} from 'lucide-react';
import { useSyncExternalStore, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useBusinessTypes } from '@/features/organizer-application/hooks/use-business-types';
import { DOCUMENT_LABELS } from '@/features/organizer-verification-documents/api/documents';
import {
  applicationStatusPresentation,
  applicationTimestamp
} from '@/features/organizer-application-status/api/status';
import {
  adminApplicationDetailsQueryOptions,
  validApplicationId,
  type AdminOrganizerReviewDecision
} from '../api/application-details';
import type { AdminApplicationFilters } from '../api/applications';
import { DocumentActions } from './document-actions';
import { AdminReviewActions } from '@/features/organizer-lifecycle/components/admin-review-actions';
import { invalidateLifecycle } from '@/features/organizer-lifecycle/api/lifecycle';
import { ContractPanel } from '@/features/organizer-contract/components/contract-panel';
import { useAdminReviewFocusRefresh } from '../hooks/use-admin-review-focus-refresh';

const emptySubscribe = () => () => {};

const reviewDecisions = {
  APPROVED: 'Documents approved',
  REJECTED: 'Application rejected',
  CHANGES_REQUESTED: 'Document changes requested'
} satisfies Record<AdminOrganizerReviewDecision['decision'], string>;

function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className='min-w-0 space-y-1'>
      <dt className='text-xs font-medium text-muted-foreground'>{label}</dt>
      <dd className='whitespace-pre-wrap break-words text-sm font-medium leading-6 [overflow-wrap:anywhere]'>
        {children || 'Not provided'}
      </dd>
    </div>
  );
}

export function ApplicationDetailsView({
  applicationId,
  filters
}: {
  applicationId: string;
  filters: AdminApplicationFilters;
}) {
  const businessTypes = useBusinessTypes();
  const queryClient = useQueryClient();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const actor = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const allowed = !!actor && !!token && actor.role === 'ADMIN';
  useAdminReviewFocusRefresh(mounted && allowed);
  const validId = validApplicationId(applicationId);
  const query = useQuery({
    ...adminApplicationDetailsQueryOptions(actor?.id ?? 0, applicationId),
    enabled: mounted && allowed && validId
  });
  const back = (
    <Button variant='outline' className='rounded-xl text-xs shadow-none' asChild>
      <Link to='/dashboard/admin/organizers/queue' search={{ ...filters, appId: undefined }}>
        <ArrowLeft className='size-3.5' aria-hidden='true' /> Back to applications
      </Link>
    </Button>
  );

  if (!mounted) return <p role='status'>Loading application details…</p>;
  if (!allowed)
    return <p role='alert'>Administrator access is required to view application details.</p>;
  if (!validId)
    return (
      <div className='space-y-4'>
        {back}
        <p role='alert'>Invalid application ID.</p>
      </div>
    );
  if (query.isPending)
    return (
      <div className='space-y-4'>
        {back}
        <p role='status'>Loading application details…</p>
      </div>
    );
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : null;
    const message =
      status === 404
        ? 'Submitted organizer application not found.'
        : status === 403
          ? 'Administrator access is required to view application details.'
          : status === 401
            ? 'Please sign in to view this application.'
            : query.error.message || 'Could not load application details.';
    return (
      <div className='space-y-4'>
        {back}
        <p role='alert'>{message}</p>
        {![400, 401, 403, 404].includes(status ?? 0) && (
          <Button onClick={() => void query.refetch()}>Try again</Button>
        )}
      </div>
    );
  }
  const application = query.data;
  const reviewHistory = application.reviewHistory ?? [];
  const documentsById = new Map(application.documents.map((document) => [document.id, document]));
  return (
    <div className='grid min-w-0 gap-5 lg:grid-cols-2 [&>section]:rounded-2xl [&>section]:p-5 [&>section]:shadow-sm sm:[&>section]:p-6'>
      <div className='flex flex-wrap items-center justify-between gap-3 lg:col-span-2'>
        {back}
        {application.status === 'APPROVED' && (
          <Button asChild variant='outline' className='ml-auto'>
            <Link to='/dashboard/admin/organizer-partners' search={{ organizerId: String(application.applicant.id) }}>
              <Building2 className='size-4' /> Xem đối tác
            </Link>
          </Button>
        )}
        <Button
          variant='outline'
          className='rounded-xl text-xs shadow-none'
          disabled={query.isFetching}
          onClick={() => void invalidateLifecycle(queryClient)}
        >
          <RefreshCw
            className={`size-3.5 ${query.isFetching ? 'animate-spin' : ''}`}
            aria-hidden='true'
          />{' '}
          Refresh details
        </Button>
      </div>
      <AdminReviewActions
        key={applicationId}
        applicationId={applicationId}
        documents={application.documents}
      />
      {['CONTRACT_PENDING', 'APPROVED'].includes(application.status) && (
        <ContractPanel key={`contract-${applicationId}`} applicationId={applicationId} />
      )}
      <section
        aria-labelledby='application-summary-heading'
        className='min-w-0 space-y-4 rounded-lg border bg-card p-4 lg:col-span-2'
      >
        <h2
          id='application-summary-heading'
          className='flex items-center gap-2 border-b pb-4 text-sm font-semibold'
        >
          <ClipboardList className='size-4 text-primary' aria-hidden='true' /> Application summary
        </h2>
        <dl className='grid min-w-0 gap-4 sm:grid-cols-2'>
          <Field label='Application ID'>#{application.id}</Field>
          <Field label='Application status'>
            <Badge
              variant={
                application.status === 'REJECTED'
                  ? 'destructive'
                  : application.status === 'APPROVED'
                    ? 'default'
                    : 'secondary'
              }
            >
              {applicationStatusPresentation(application.status).label}
            </Badge>
          </Field>
          <Field label='Submitted at'>{applicationTimestamp(application.submittedAt)}</Field>
        </dl>
      </section>
      <section
        aria-labelledby='business-heading'
        className='min-w-0 space-y-4 rounded-lg border bg-card p-4'
      >
        <h2
          id='business-heading'
          className='flex items-center gap-2 border-b pb-4 text-sm font-semibold'
        >
          <Building2 className='size-4 text-primary' aria-hidden='true' /> Business and legal
          information
        </h2>
        <dl className='grid min-w-0 gap-4 sm:grid-cols-2'>
          <Field label='Legal business name'>{application.legalName}</Field>
          <Field label='Business type'>{businessTypes.label(application.businessType)}</Field>
          <Field label='Tax ID'>{application.taxId}</Field>
          <Field label='Legal representative'>{application.representativeName}</Field>
          <Field label='Business address'>{application.address}</Field>
          <Field label='Contact email'>{application.contactEmail}</Field>
          <Field label='Contact phone'>{application.contactPhone}</Field>
        </dl>
      </section>
      <section
        aria-labelledby='applicant-heading'
        className='min-w-0 space-y-4 rounded-lg border bg-card p-4'
      >
        <h2
          id='applicant-heading'
          className='flex items-center gap-2 border-b pb-4 text-sm font-semibold'
        >
          <UserRound className='size-4 text-primary' aria-hidden='true' /> Applicant
        </h2>
        <dl className='grid min-w-0 gap-4 sm:grid-cols-2'>
          <Field label='Applicant ID'>#{application.applicant.id}</Field>
          <Field label='Full name'>{application.applicant.fullName}</Field>
          <Field label='Username'>{application.applicant.userName}</Field>
          <Field label='Account email'>{application.applicant.email}</Field>
        </dl>
      </section>
      <section
        aria-labelledby='documents-heading'
        className='min-w-0 space-y-4 rounded-lg border bg-card p-4 lg:col-span-2'
      >
        <h2
          id='documents-heading'
          className='flex items-center gap-2 border-b pb-4 text-sm font-semibold'
        >
          <Files className='size-4 text-primary' aria-hidden='true' /> Verification documents
        </h2>
        <p className='text-sm text-muted-foreground'>
          View or download submitted documents securely. These actions do not change verification
          status.
        </p>
        {!application.documents.length ? (
          <p>No verification documents are available for this application.</p>
        ) : (
          <Table className='text-xs [&_td]:py-4 [&_th]:text-[11px]'>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead>Document ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Original filename</TableHead>
                <TableHead>Uploaded at</TableHead>
                <TableHead>Verification status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Document feedback</TableHead>
                <TableHead>File actions</TableHead>
              </TableRow>
            </TableHeader>
            {Array.from(new Set(application.documents.map((document) => document.documentType))).map((groupType) => {
              const group = application.documents.filter((document) => document.documentType === groupType);
              const label = groupType === 'WORKSPACE_OVERVIEW' && businessTypes.language === 'vi'
                ? 'Hồ sơ giới thiệu workspace' : DOCUMENT_LABELS[groupType] ?? groupType;
              return <TableBody key={groupType}>
              <TableRow className='bg-muted/20'>
                <TableCell colSpan={8} className='font-semibold'>
                  {label} · {group.filter((document) => document.current).length} {businessTypes.language === 'vi' ? 'tệp hiện hành' : 'current files'}
                </TableCell>
              </TableRow>
              {group.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>#{document.id}</TableCell>
                  <TableCell>
                    {document.documentType === 'WORKSPACE_OVERVIEW'
                      ? businessTypes.language === 'vi' ? 'Hồ sơ giới thiệu workspace' : 'Workspace overview'
                      : (DOCUMENT_LABELS[document.documentType] ?? document.documentType)}
                  </TableCell>
                  <TableCell className='max-w-64 whitespace-normal break-words [overflow-wrap:anywhere]'>
                    {document.fileName}
                  </TableCell>
                  <TableCell>{applicationTimestamp(document.uploadedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={document.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                      {document.status === 'REPLACED'
                        ? 'Replaced'
                        : document.status === 'VERIFIED'
                          ? 'Verified'
                          : document.status === 'REJECTED'
                            ? 'Rejected'
                            : 'Pending verification'}
                    </Badge>
                  </TableCell>
                  <TableCell>{document.current ? 'Current' : 'Previous version'}</TableCell>
                  <TableCell className='max-w-72 whitespace-pre-wrap break-words [overflow-wrap:anywhere]'>
                    {document.adminFeedback?.trim() || 'No document feedback recorded.'}
                  </TableCell>
                  <TableCell>
                    {document.status === 'REPLACED' ? (
                      <span className='text-xs text-muted-foreground'>
                        Historical record · file removed
                      </span>
                    ) : (
                      <DocumentActions applicationId={applicationId} document={document} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              </TableBody>;
            })}
          </Table>
        )}
      </section>
      <section
        aria-labelledby='registration-reason-heading'
        className='min-w-0 space-y-3 rounded-lg border bg-card p-4'
      >
        <h2
          id='registration-reason-heading'
          className='flex items-center gap-2 border-b pb-4 text-sm font-semibold'
        >
          <MessageSquare className='size-4 text-primary' aria-hidden='true' /> Registration reason
        </h2>
        <p className='whitespace-pre-wrap break-words [overflow-wrap:anywhere]'>
          {application.registrationReason?.trim() ||
            'No registration reason was recorded for this application.'}
        </p>
      </section>
      {(reviewHistory.length > 0 || application.reviewedAt || application.reviewFeedback?.trim()) && (
      <section
        aria-labelledby='review-heading'
        className='min-w-0 space-y-4 rounded-lg border bg-card p-4'
      >
        <h2
          id='review-heading'
          className='flex items-center gap-2 border-b pb-4 text-sm font-semibold'
        >
          <Clock3 className='size-4 text-primary' aria-hidden='true' /> Review history
        </h2>
        {reviewHistory.length > 0 ? (
          <ol className='space-y-3'>
            {reviewHistory.map((review) => (
              <li key={review.id} className='min-w-0 space-y-2 rounded-xl border bg-background/60 p-3'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <Badge variant={review.decision === 'REJECTED' ? 'destructive' : 'secondary'}>
                    {reviewDecisions[review.decision]}
                  </Badge>
                  <time className='text-xs text-muted-foreground' dateTime={review.reviewedAt}>
                    {applicationTimestamp(review.reviewedAt)}
                  </time>
                </div>
                {review.reviewerName && <p className='text-xs text-muted-foreground'>Reviewed by {review.reviewerName}</p>}
                {review.feedback?.trim() && (
                  <p className='whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]'>{review.feedback}</p>
                )}
                {review.documentFeedback.length > 0 && (
                  <ul className='space-y-2 border-t pt-2'>
                    {review.documentFeedback.map(({ documentId, feedback }) => {
                      const document = documentsById.get(documentId);
                      return (
                        <li key={documentId} className='min-w-0 text-xs [overflow-wrap:anywhere]'>
                          <p className='font-medium'>
                            {document ? `${DOCUMENT_LABELS[document.documentType] ?? document.documentType} · ${document.fileName}` : `Document #${documentId}`}
                          </p>
                          <p className='mt-1 whitespace-pre-wrap text-muted-foreground'>{feedback}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <dl className='grid min-w-0 gap-4 sm:grid-cols-2'>
            {application.reviewedAt && <Field label='Reviewed at'>{applicationTimestamp(application.reviewedAt)}</Field>}
            {application.reviewFeedback?.trim() && <Field label='Review feedback'>{application.reviewFeedback}</Field>}
          </dl>
        )}
      </section>
      )}
    </div>
  );
}
