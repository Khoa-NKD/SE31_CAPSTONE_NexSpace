import { useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Building2,
  ClipboardCheck,
  FileText,
  RefreshCw,
  ShieldCheck,
  CalendarDays,
  FileSignature,
  ArrowDownRight,
  CheckCheck,
  LockKeyhole
} from 'lucide-react';
import { ContractPanel } from '@/features/organizer-contract/components/contract-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  applicationStatusQueryOptions,
  applicationTimestamp
} from '@/features/organizer-application-status/api/status';
import { verificationDocumentsQueryOptions } from '@/features/organizer-verification-documents/api/documents';
import { documentPoliciesQueryOptions, documentTypeLabel } from '../api/document-requirements';
import { invalidateLifecycle } from '@/features/organizer-lifecycle/api/lifecycle';
import { OwnerDocumentActions } from '@/features/organizer-verification-documents/components/owner-document-actions';
import { useBusinessTypes } from '../hooks/use-business-types';
import { useOrganizerTranslation } from '../hooks/use-organizer-translation';

const subscribe = () => () => {};
const dateLabel = (value?: string | null) =>
  applicationTimestamp(value).replace(/\.\d+(?= UTC)/, '');

/** An approved application's archive is separate from onboarding and editable business contact details. */
export function ApprovedApplicationView() {
  const tr = useOrganizerTranslation();
  const businessTypes = useBusinessTypes();
  const client = useQueryClient();
  const actor = useAuthStore((state) => state.user);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
  const enabled = mounted && actor?.role === 'ORGANIZER';
  const application = useQuery({ ...applicationStatusQueryOptions(actor?.id ?? 0), enabled });
  const documents = useQuery({ ...verificationDocumentsQueryOptions(actor?.id ?? 0), enabled });
  const policies = useQuery({ ...documentPoliciesQueryOptions(), enabled });
  if (!mounted || application.isPending)
    return <p role='status'>{tr('Loading your application…')}</p>;
  if (application.isError)
    return (
      <div role='alert' className='space-y-3 rounded-2xl border bg-card p-5'>
        <p>{application.error.message}</p>
        <Button variant='outline' onClick={() => void application.refetch()}>
          {tr('Try again')}
        </Button>
      </div>
    );
  const data = application.data;
  if (!data || data.status !== 'APPROVED')
    return (
      <div className='space-y-3 rounded-2xl border bg-card p-5'>
        <p>{tr('Continue your application on the registration page.')}</p>
        <Button asChild>
          <Link to='/organizer/apply'>{tr('Your organizer application')}</Link>
        </Button>
      </div>
    );
  const policy = policies.data?.find((item) => item.businessType === data.businessType);
  const fields = [
    ['Legal business name', data.legalName],
    ['Business type', businessTypes.label(data.businessType)],
    ['Tax ID', data.taxId],
    ['Legal representative', data.representativeName],
    ['Business address', data.address],
    ['Contact email', data.contactEmail],
    ['Contact phone', data.contactPhone]
  ];
  const sections = [
    { id: 'application-overview', label: 'Application overview', icon: ClipboardCheck },
    { id: 'application-business', label: 'Business details', icon: Building2 },
    { id: 'application-agreement', label: 'Cooperation agreement', icon: FileSignature },
    { id: 'application-documents', label: 'Verification documents', icon: FileText }
  ];
  return (
    <div className='space-y-6'>
      <section
        id='application-overview'
        className='scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm'
      >
        <div className='bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-7'>
          <div className='flex flex-wrap items-start justify-between gap-5'>
            <div className='flex min-w-0 flex-1 gap-4'>
              <span className='flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-background text-primary'>
                <ClipboardCheck className='size-6' />
              </span>
              <div className='min-w-0'>
                <p className='mb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-primary'>
                  {tr('Application #')}
                  {data.id}
                </p>
                <h2 className='break-words text-xl font-semibold tracking-tight sm:text-2xl'>
                  {data.legalName || tr('Your organizer application')}
                </h2>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-muted-foreground'>
                  {tr(
                    'Your approved application is read-only. You can view or download its documents here.'
                  )}
                </p>
              </div>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              <Badge className='gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-700 dark:text-emerald-300'>
                <CheckCheck className='size-3.5' />
                {tr('Approved')}
              </Badge>
              <Button
                type='button'
                variant='outline'
                size='icon'
                disabled={application.isFetching || documents.isFetching}
                aria-label={tr('Refresh application record')}
                onClick={() => void invalidateLifecycle(client)}
              >
                <RefreshCw
                  className={`size-4 ${application.isFetching || documents.isFetching ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </div>
        <dl className='grid divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
          <div className='p-5'>
            <dt className='flex items-center gap-2 text-xs text-muted-foreground'>
              <CalendarDays className='size-4 text-primary' />
              {tr('Submitted at')}
            </dt>
            <dd className='mt-2 break-words text-sm font-medium'>{dateLabel(data.submittedAt)}</dd>
          </div>
          <div className='p-5'>
            <dt className='flex items-center gap-2 text-xs text-muted-foreground'>
              <ShieldCheck className='size-4 text-primary' />
              {tr('Reviewed at')}
            </dt>
            <dd className='mt-2 break-words text-sm font-medium'>{dateLabel(data.reviewedAt)}</dd>
          </div>
          <div className='p-5'>
            <dt className='flex items-center gap-2 text-xs text-muted-foreground'>
              <FileText className='size-4 text-primary' />
              {tr('Uploaded documents')}
            </dt>
            <dd className='mt-2 text-sm font-medium'>
              {documents.isSuccess ? documents.data.documents.length : '—'}
            </dd>
          </div>
        </dl>
      </section>
      <nav
        aria-label={tr('Application sections')}
        className='flex gap-2 overflow-x-auto rounded-2xl border bg-card p-2 shadow-sm'
      >
        {sections.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className='inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          >
            <Icon className='size-4' />
            {tr(label)}
            <ArrowDownRight className='size-3 opacity-50' />
          </a>
        ))}
      </nav>
      <section
        id='application-business'
        className='scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm'
      >
        <div className='flex items-center justify-between gap-3 border-b bg-muted/15 px-5 py-4 sm:px-6'>
          <h2 className='flex items-center gap-3 text-base font-semibold'>
            <span className='flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Building2 className='size-4' />
            </span>
            {tr('Business details')}
          </h2>
          <Badge variant='outline' className='gap-1.5 text-[10px]'>
            <LockKeyhole className='size-3' />
            {tr('Read-only')}
          </Badge>
        </div>
        <dl className='grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6'>
          {fields.map(([label, value]) => (
            <div
              key={label}
              className={`min-w-0 ${label === 'Business address' ? 'sm:col-span-2' : ''}`}
            >
              <dt className='text-xs text-muted-foreground'>{tr(label)}</dt>
              <dd className='mt-1.5 break-words text-sm font-medium leading-6'>{value || '—'}</dd>
            </div>
          ))}
          <div className='border-t pt-4 sm:col-span-2'>
            <dt className='text-xs text-muted-foreground'>{tr('Registration reason')}</dt>
            <dd className='mt-2 whitespace-pre-wrap break-words text-sm leading-6'>
              {data.registrationReason || '—'}
            </dd>
          </div>
        </dl>
      </section>
      <div id='application-agreement' className='scroll-mt-24'>
        <ContractPanel key={`contract-${actor?.id}`} presentation='record' />
      </div>
      <section
        id='application-documents'
        className='scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm'
      >
        <div className='flex flex-wrap items-center justify-between gap-3 border-b bg-muted/15 px-5 py-4 sm:px-6'>
          <h2 className='flex items-center gap-3 text-base font-semibold'>
            <span className='flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <FileText className='size-4' />
            </span>
            {tr('Verification documents')}
          </h2>
          <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <ShieldCheck className='size-3.5 text-primary' />
            {tr('Documents stay private')}
          </span>
        </div>
        <div className='p-5 sm:p-6'>
          {documents.isPending ? (
            <p role='status' className='text-sm text-muted-foreground'>
              {tr('Loading current documents…')}
            </p>
          ) : documents.isError ? (
            <div role='alert' className='space-y-3'>
              <p className='text-sm'>{documents.error.message}</p>
              <Button variant='outline' onClick={() => void documents.refetch()}>
                {tr('Reload documents')}
              </Button>
            </div>
          ) : !documents.data.documents.length ? (
            <div className='rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground'>
              {tr('No current documents have been uploaded.')}
            </div>
          ) : (
            <ul className='grid gap-4 lg:grid-cols-2'>
              {documents.data.documents.map((document) => (
                <li
                  key={document.id}
                  className='min-w-0 space-y-4 rounded-xl border bg-background p-4'
                >
                  <div className='flex items-start gap-3'>
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                      <FileText className='size-5' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-semibold leading-6'>
                        {documentTypeLabel(document.documentType, businessTypes.language, policy)}
                      </p>
                      <p className='mt-1 break-all text-xs leading-5 text-muted-foreground'>
                        {document.fileName}
                      </p>
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <Badge
                      variant='secondary'
                      className={
                        document.status === 'VERIFIED'
                          ? 'gap-1 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300'
                          : 'text-[10px]'
                      }
                    >
                      {document.status === 'VERIFIED' && <ShieldCheck className='size-3' />}
                      {tr(document.status)}
                    </Badge>
                    <span className='text-[11px] text-muted-foreground'>
                      {dateLabel(document.uploadedAt)}
                    </span>
                  </div>
                  <div className='border-t pt-3'>
                    <OwnerDocumentActions
                      profileId={documents.data.profileId}
                      document={document}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
