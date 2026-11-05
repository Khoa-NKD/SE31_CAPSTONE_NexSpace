import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Building2, ClipboardCheck, FileText, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  applicationStatusQueryOptions,
  applicationTimestamp
} from '@/features/organizer-application-status/api/status';
import {
  DOCUMENT_LABELS,
  verificationDocumentsQueryOptions
} from '@/features/organizer-verification-documents/api/documents';
import { OwnerDocumentActions } from '@/features/organizer-verification-documents/components/owner-document-actions';
import { useBusinessTypes } from '../hooks/use-business-types';
import { useOrganizerTranslation } from '../hooks/use-organizer-translation';

const subscribe = () => () => {};

/** Approved onboarding is a read-only record; contact updates remain in Business Profile. */
export function ApprovedApplicationView() {
  const tr = useOrganizerTranslation();
  const businessTypes = useBusinessTypes();
  const actor = useAuthStore((state) => state.user);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const enabled = mounted && actor?.role === 'ORGANIZER';
  const application = useQuery({ ...applicationStatusQueryOptions(actor?.id ?? 0), enabled });
  const documents = useQuery({ ...verificationDocumentsQueryOptions(actor?.id ?? 0), enabled });
  if (!mounted || application.isPending)
    return <p role='status'>{tr('Loading your application…')}</p>;
  if (application.isError)
    return (
      <div role='alert' className='space-y-3 rounded-lg border bg-card p-5'>
        <p>{application.error.message}</p>
        <Button variant='outline' onClick={() => void application.refetch()}>
          {tr('Try again')}
        </Button>
      </div>
    );
  const data = application.data;
  if (!data || data.status !== 'APPROVED')
    return (
      <div className='space-y-3 rounded-lg border bg-card p-5'>
        <p>{tr('Continue your application on the registration page.')}</p>
        <Button asChild>
          <Link to='/organizer/apply'>{tr('Your organizer application')}</Link>
        </Button>
      </div>
    );
  const fields = [
    ['Legal business name', data.legalName],
    ['Business type', businessTypes.label(data.businessType)],
    ['Tax ID', data.taxId],
    ['Legal representative', data.representativeName],
    ['Business address', data.address],
    ['Contact email', data.contactEmail],
    ['Contact phone', data.contactPhone]
  ];
  return (
    <div className='space-y-5'>
      <section className='space-y-5 rounded-lg border bg-card p-5 sm:p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex items-center gap-3'>
            <span className='flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary'>
              <ClipboardCheck className='size-5' aria-hidden='true' />
            </span>
            <div>
              <h2 className='text-base font-semibold'>
                {data.legalName || tr('Your organizer application')}
              </h2>
              <p className='mt-1 text-xs text-muted-foreground'>
                {tr('Application #')}
                {data.id}
              </p>
            </div>
          </div>
          <Badge className='rounded-md bg-primary/10 text-primary'>{tr('Approved')}</Badge>
        </div>
        <p className='text-sm leading-6 text-muted-foreground'>
          {tr(
            'Your approved application is read-only. You can view or download its documents here.'
          )}
        </p>
        <dl className='grid gap-4 border-t pt-4 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-xs text-muted-foreground'>{tr('Submitted at')}</dt>
            <dd className='mt-1'>{applicationTimestamp(data.submittedAt)}</dd>
          </div>
          <div>
            <dt className='text-xs text-muted-foreground'>{tr('Reviewed at')}</dt>
            <dd className='mt-1'>{applicationTimestamp(data.reviewedAt)}</dd>
          </div>
        </dl>
      </section>
      <section className='space-y-5 rounded-lg border bg-card p-5 sm:p-6'>
        <h2 className='flex items-center gap-2 border-b pb-4 text-sm font-semibold'>
          <Building2 className='size-4 text-primary' aria-hidden='true' />
          {tr('Business details')}
        </h2>
        <dl className='grid gap-x-8 gap-y-5 sm:grid-cols-2'>
          {fields.map(([label, value]) => (
            <div key={label} className='min-w-0'>
              <dt className='text-xs text-muted-foreground'>{tr(label)}</dt>
              <dd className='mt-1 break-words text-sm font-medium'>{value || '—'}</dd>
            </div>
          ))}
          <div className='sm:col-span-2'>
            <dt className='text-xs text-muted-foreground'>{tr('Registration reason')}</dt>
            <dd className='mt-1 whitespace-pre-wrap break-words text-sm leading-6'>
              {data.registrationReason || '—'}
            </dd>
          </div>
        </dl>
      </section>
      <section className='space-y-4 rounded-lg border bg-card p-5 sm:p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-4'>
          <h2 className='flex items-center gap-2 text-sm font-semibold'>
            <FileText className='size-4 text-primary' aria-hidden='true' />
            {tr('Verification documents')}
          </h2>
          <Button
            variant='outline'
            size='sm'
            disabled={application.isFetching || documents.isFetching}
            onClick={() => void Promise.all([application.refetch(), documents.refetch()])}
          >
            <RefreshCw className='size-3.5' aria-hidden='true' />
            {tr('Refresh status')}
          </Button>
        </div>
        {documents.isPending ? (
          <p role='status'>{tr('Loading verification documents…')}</p>
        ) : documents.isError ? (
          <div role='alert'>
            <p>{documents.error.message}</p>
            <Button variant='outline' onClick={() => void documents.refetch()}>
              {tr('Reload documents')}
            </Button>
          </div>
        ) : !documents.data.documents.length ? (
          <p className='text-sm text-muted-foreground'>
            {tr('No current documents have been uploaded.')}
          </p>
        ) : (
          <ul className='grid gap-3 md:grid-cols-2'>
            {documents.data.documents.map((document) => (
              <li
                key={document.id}
                className='min-w-0 space-y-3 rounded-md border bg-background p-4'
              >
                <div className='flex items-start justify-between gap-3'>
                  <p className='text-sm font-semibold'>
                    {tr(DOCUMENT_LABELS[document.documentType])}
                  </p>
                  <Badge variant='secondary' className='text-[10px]'>
                    {tr(document.status)}
                  </Badge>
                </div>
                <p className='break-all text-xs leading-5 text-muted-foreground'>
                  {document.fileName}
                </p>
                <OwnerDocumentActions profileId={documents.data.profileId} document={document} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
