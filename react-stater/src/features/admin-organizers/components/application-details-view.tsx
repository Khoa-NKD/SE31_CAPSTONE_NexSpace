import { useSyncExternalStore, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
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
import { BUSINESS_TYPES } from '@/features/organizer-application/api/application';
import { DOCUMENT_LABELS } from '@/features/organizer-verification-documents/api/documents';
import {
  applicationStatusPresentation,
  applicationTimestamp
} from '@/features/organizer-application-status/api/status';
import {
  adminApplicationDetailsQueryOptions,
  validApplicationId
} from '../api/application-details';
import type { AdminApplicationFilters } from '../api/applications';
import { DocumentActions } from './document-actions';

const emptySubscribe = () => () => {};

function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className='min-w-0 space-y-1'>
      <dt className='text-sm text-muted-foreground'>{label}</dt>
      <dd className='whitespace-pre-wrap break-words [overflow-wrap:anywhere]'>
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
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const actor = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const allowed = !!actor && !!token && actor.role === 'ADMIN';
  const validId = validApplicationId(applicationId);
  const query = useQuery({
    ...adminApplicationDetailsQueryOptions(actor?.id ?? 0, applicationId),
    enabled: mounted && allowed && validId
  });
  const back = (
    <Button variant='outline' asChild>
      <Link to='/dashboard/admin/organizers/queue' search={{ ...filters, appId: undefined }}>
        Back to applications
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
  return (
    <div className='min-w-0 space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        {back}
        <Button variant='outline' disabled={query.isFetching} onClick={() => void query.refetch()}>
          Refresh details
        </Button>
      </div>
      <section
        aria-labelledby='application-summary-heading'
        className='min-w-0 space-y-4 rounded-lg border bg-card p-4'
      >
        <h2 id='application-summary-heading' className='text-lg font-semibold'>
          Application summary
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
        <h2 id='business-heading' className='text-lg font-semibold'>
          Business and legal information
        </h2>
        <dl className='grid min-w-0 gap-4 sm:grid-cols-2'>
          <Field label='Legal business name'>{application.legalName}</Field>
          <Field label='Business type'>
            {BUSINESS_TYPES.find(([type]) => type === application.businessType)?.[1] ??
              application.businessType}
          </Field>
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
        <h2 id='applicant-heading' className='text-lg font-semibold'>
          Applicant
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
        className='min-w-0 space-y-4 rounded-lg border bg-card p-4'
      >
        <h2 id='documents-heading' className='text-lg font-semibold'>
          Verification documents
        </h2>
        <p className='text-sm text-muted-foreground'>
          View or download submitted documents securely. These actions do not change verification
          status.
        </p>
        {!application.documents.length ? (
          <p>No verification documents are available for this application.</p>
        ) : (
          <Table>
            <TableHeader>
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
            <TableBody>
              {application.documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>#{document.id}</TableCell>
                  <TableCell>
                    {DOCUMENT_LABELS[document.documentType] ?? document.documentType}
                  </TableCell>
                  <TableCell className='max-w-64 whitespace-normal break-words [overflow-wrap:anywhere]'>
                    {document.fileName}
                  </TableCell>
                  <TableCell>{applicationTimestamp(document.uploadedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={document.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                      {document.status === 'VERIFIED'
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
                    <DocumentActions applicationId={applicationId} document={document} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
      <section
        aria-labelledby='review-heading'
        className='min-w-0 space-y-4 rounded-lg border bg-card p-4'
      >
        <h2 id='review-heading' className='text-lg font-semibold'>
          Current review outcome
        </h2>
        <dl className='grid min-w-0 gap-4 sm:grid-cols-2'>
          <Field label='Reviewed at'>
            {application.reviewedAt
              ? applicationTimestamp(application.reviewedAt)
              : 'No review date recorded.'}
          </Field>
          <Field label='Review feedback'>
            {application.reviewFeedback?.trim() || 'No review feedback recorded.'}
          </Field>
        </dl>
      </section>
    </div>
  );
}
