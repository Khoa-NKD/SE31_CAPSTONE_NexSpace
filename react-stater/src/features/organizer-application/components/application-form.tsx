import { DOCUMENT_LABELS } from '@/features/organizer-verification-documents/api/documents';
import { ContractPanel } from '@/features/organizer-contract/components/contract-panel';
import { DocumentRequirementsChecklist } from './document-requirements-checklist';
import {
  documentPoliciesQueryOptions,
  missingRequiredDocuments
} from '../api/document-requirements';
import { verificationDocumentsQueryOptions } from '@/features/organizer-verification-documents/api/documents';
import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import { ApiError } from '@/lib/api-client';
import { currentUser } from '@/features/auth/api/session';
import type { SessionUser } from '@/features/auth/api/session';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { VerificationDocumentsView } from '@/features/organizer-verification-documents/components/verification-documents-view';
import { DraftVerificationDocuments } from '@/features/organizer-verification-documents/components/draft-verification-documents';
import { verificationDocumentKeys } from '@/features/organizer-verification-documents/api/documents';
import {
  applicationDraftSchema,
  registrationReasonSubmissionSchema,
  currentApplication,
  startApplicationDraft,
  applicationHistory,
  saveApplicationDraft,
  submitApplicationDraft
} from '../api/application';
import type { ApplicationInput, ApplicationDetails } from '../api/application';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  ClipboardCheck,
  Files,
  RefreshCw,
  MessageSquareText,
  FileText,
  ArrowDown,
  ArrowDownRight,
  LockKeyhole
} from 'lucide-react';
import {
  applicationStatusPresentation,
  applicationTimestamp
} from '@/features/organizer-application-status/api/status';
import { useBusinessTypes } from '../hooks/use-business-types';
import { useApplicationNotice } from '../hooks/use-application-notice';
import {
  ownerLifecycle,
  resubmit,
  invalidateLifecycle,
  type LifecycleContext
} from '@/features/organizer-lifecycle/api/lifecycle';
import { CorrectionDocuments } from '@/features/organizer-lifecycle/components/correction-documents';
import { OwnerLifecycleStatus } from '@/features/organizer-lifecycle/components/owner-lifecycle-status';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

const fields = [
  ['legalName', 'Legal business name', 255],
  ['taxId', 'Tax ID', 50],
  ['representativeName', 'Legal representative', 100],
  ['address', 'Business address', 500],
  ['contactPhone', 'Contact phone', 20],
  ['contactEmail', 'Contact email', 255]
] as const;

function formValues(details: ApplicationDetails | null, email = ''): ApplicationInput {
  return {
    legalName: details?.legalName ?? '',
    businessType: details?.businessType ?? 'LIMITED_LIABILITY',
    taxId: details?.taxId ?? '',
    representativeName: details?.representativeName ?? '',
    address: details?.address ?? '',
    contactPhone: details?.contactPhone ?? '',
    contactEmail: details?.contactEmail ?? email,
    registrationReason: details?.registrationReason ?? ''
  };
}

/** Remount owner-specific form state when the shared session changes. */
export function ApplicationForm() {
  const actorId = useAuthStore((state) => state.user?.id);
  const [attempt, setAttempt] = useState(0);
  return (
    <OwnedApplicationForm
      key={`${actorId ?? 'anonymous'}:${attempt}`}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

function OwnedApplicationForm({ onRetry }: { onRetry: () => void }) {
  const tr = useOrganizerTranslation();
  const businessTypes = useBusinessTypes();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [details, setDetails] = useState<ApplicationDetails | null>(null);
  const [checking, setChecking] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useApplicationNotice(feedback, error, busy);
  const [lifecycle, setLifecycle] = useState<LifecycleContext | null>(null);
  const [confirmResubmit, setConfirmResubmit] = useState(false);
  const operation = useRef(false);
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: ['organizer-application-history', user?.id],
    queryFn: applicationHistory,
    enabled: !!user && !!details
  });
  const form = useForm<ApplicationInput>({ defaultValues: formValues(null) });
  const isDirty = form.formState.isDirty;
  const [focusRequest, setFocusRequest] = useState<{
    documentId: number;
    requestId: number;
  } | null>(null);
  const jumpCounter = useRef(0);
  const reviewDocuments = useQuery({
    ...verificationDocumentsQueryOptions(user?.id ?? 0),
    enabled: !!user && details?.status === 'REVISION_REQUESTED'
  });
  const requestedDocuments =
    reviewDocuments.data?.documents.filter((document) => document.status === 'REJECTED') ?? [];
  const jumpToDocument = (documentId?: number) => {
    if (documentId !== undefined) setFocusRequest({ documentId, requestId: ++jumpCounter.current });
    else
      document
        .getElementById('organizer-verification-documents')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const selectedBusinessType = useWatch({ control: form.control, name: 'businessType' });
  const availableBusinessTypes = businessTypes.options.filter((option) => option.code !== 'OTHER');
  const householdBusiness = selectedBusinessType === 'HOUSEHOLD_BUSINESS';
  const legacyBusinessType = selectedBusinessType === 'OTHER';
  function taxIdFormatError(value: string) {
    if (!value || legacyBusinessType || (householdBusiness ? /^[0-9]{12}$/ : /^[0-9]{10}$/).test(value.trim())) return;
    return householdBusiness
      ? "Enter the representative's 12-digit personal identification number"
      : 'Enter the 10-digit business tax ID';
  }

  function checkTaxId() {
    const value = form.getValues('taxId').trim();
    const message = value ? taxIdFormatError(value) : 'This field is required.';
    if (message) form.setError('taxId', { type: 'taxIdFormat', message });
    else if (form.getFieldState('taxId').error?.type === 'taxIdFormat') form.clearErrors('taxId');
  }

  useEffect(() => {
    const controller = new AbortController();
    void currentUser(controller.signal)
      .then(async (account) => {
        if (controller.signal.aborted) return;
        setUser(account);
        const application = await currentApplication(controller.signal);
        const permissions =
          application && application.status === 'REVISION_REQUESTED'
            ? await ownerLifecycle(controller.signal)
            : null;
        if (controller.signal.aborted) return;
        setLifecycle(permissions);
        setDetails(application);
        form.reset(formValues(application, account.email));
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          failure instanceof Error ? failure.message : 'Could not load your application.';
        if (failure instanceof ApiError && [401, 403].includes(failure.status))
          setAccessError(message);
        else setLoadError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [form]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const run = async (action: 'start' | 'save' | 'submit') => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    setFeedback('');
    form.clearErrors();
    try {
      let successMessage: string;
      if (action === 'start') {
        const draft = await startApplicationDraft();
        setDetails(draft);
        form.reset(formValues(draft, user?.email));
        await queryClient.invalidateQueries({ queryKey: ['organizer-application-history', user?.id] });
        successMessage = 'Draft created. Save your details and upload your business license below.';
      } else if (details?.status === 'REVISION_REQUESTED') {
        if (action !== 'submit')
          throw new Error('Business information is locked after submission.');
        if (!lifecycle?.canCorrect) throw new Error('Reload the application before resubmitting.');
        const receipt = await resubmit(lifecycle.revision);
        setDetails({ ...details, ...receipt });
        setLifecycle(receipt);
        setConfirmResubmit(false);
        successMessage =
          'Application submitted. Your account permissions change only after approval.';
      } else {
        if (!availableBusinessTypes.length)
          throw new Error('Load the business type catalog before saving or submitting.');
        // Both actions persist the visible snapshot; only explicit submission changes status.

        const parsed = applicationDraftSchema.safeParse(form.getValues());
        if (!parsed.success) {
          for (const issue of parsed.error.issues)
            form.setError(issue.path[0] as keyof ApplicationInput, { message: issue.message });
          setError('Correct the highlighted fields before saving or submitting.');
          document.getElementById(String(parsed.error.issues[0].path[0]))?.scrollIntoView({ block: 'center' });
          return;
        }
        if (action === 'submit') {
          const requiredFields = fields.map(([name]) => name).filter((name) => !parsed.data[name]);
          for (const name of requiredFields) {
            form.setError(name, { message: tr('This field is required.') });
          }
          if (legacyBusinessType) {
            form.setError('businessType', { message: tr('Choose a supported business type') });
          }
          const taxError = taxIdFormatError(parsed.data.taxId);
          if (taxError) form.setError('taxId', { type: 'taxIdFormat', message: taxError });
          const reason = registrationReasonSubmissionSchema.safeParse(
            parsed.data.registrationReason
          );
          if (!reason.success) {
            form.setError('registrationReason', { message: reason.error.issues[0].message });
          }
          const firstInvalid = (['businessType', ...fields.map(([name]) => name), 'registrationReason'] as const)
            .find((name) => form.getFieldState(name).invalid);
          if (firstInvalid) {
            setError('Correct the highlighted fields before saving or submitting.');
            document.getElementById(firstInvalid)?.scrollIntoView({ block: 'center' });
            return;
          }
        }
        if (action === 'submit' && user) {
          const policies = await queryClient.fetchQuery(documentPoliciesQueryOptions());
          const policy = policies.find((item) => item.businessType === parsed.data.businessType);
          if (!policy) throw new Error('Reload the document requirements before submitting.');
          const uploaded = await queryClient.fetchQuery(verificationDocumentsQueryOptions(user.id));
          const missing = missingRequiredDocuments(policy, uploaded.documents);
          if (missing.length) {
            document.getElementById('organizer-required-documents')?.scrollIntoView({ block: 'center' });
            throw new Error(
              (businessTypes.language === 'vi'
                ? 'Còn thiếu hoặc cần thay tài liệu: '
                : 'Upload or replace the required documents: ') +
                missing
                  .map((item) => (businessTypes.language === 'vi' ? item.labelVi : item.labelEn))
                  .join(', ')
            );
          }
        }
        const saved = await saveApplicationDraft(parsed.data);
        if (!saved) throw new Error('Application no longer exists. Reload this page.');
        setDetails(saved);
        form.reset(formValues(saved));
        if (action === 'submit') {
          const receipt = await submitApplicationDraft();
          setDetails({ ...saved, ...receipt });
          setConfirmResubmit(false);
          successMessage =
            'Application submitted. Your account permissions change only after approval.';
        } else
          successMessage =
            'Draft saved. You can return later; it has not been submitted for review.';
      }
      if (user)
        await queryClient.invalidateQueries({
          queryKey: verificationDocumentKeys.detail(user.id),
          exact: true
        });
      await invalidateLifecycle(queryClient);
      // Publish success together with the final busy-state update after all refreshes finish.
      setFeedback(successMessage);
    } catch (failure) {
      if (failure instanceof ApiError) {
        for (const [path, message] of Object.entries(failure.validationErrors ?? {})) {
          const field = path.replace(/^application\./, '');
          if (
            field === 'businessType' ||
            field === 'registrationReason' ||
            fields.some(([name]) => name === field)
          )
            form.setError(field as keyof ApplicationInput, { message });
        }
        if ([401, 403].includes(failure.status)) setAccessError(failure.message);
        if (failure.status === 409) {
          // Refresh status without replacing unsaved text; another tab may have submitted.
          try {
            setDetails(await currentApplication());
            setLifecycle(await ownerLifecycle());
          } catch {
            /* Keep the actionable original error. */
          }
        }
      }
      const fieldErrors =
        failure instanceof ApiError ? Object.values(failure.validationErrors ?? {}) : [];
      setError(
        [
          failure instanceof Error ? failure.message : 'Request failed. Please try again.',
          ...fieldErrors
        ].join(' ')
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };

  if (checking) return <p role='status'>{tr('Loading your application…')}</p>;
  if (loadError)
    return (
      <div role='alert' className='space-y-3'>
        <p>{tr(loadError)}</p>
        <Button onClick={onRetry}>{tr('Try again')}</Button>
      </div>
    );
  if (accessError || !user)
    return (
      <div role='alert' className='space-y-3'>
        <p>{accessError || tr('Please sign in to apply.')}</p>
        <Link to='/auth/sign-in' className='text-primary underline'>
          {tr('Sign in')}{' '}
        </Link>
      </div>
    );
  if (
    !user.verified ||
    user.status !== 'ACTIVE' ||
    !['USER', 'ORGANIZER'].includes(user.role ?? '')
  )
    return (
      <p role='alert'>
        {tr('An active, email-verified Customer or Organizer account is required to apply.')}{' '}
      </p>
    );

  const correcting = !!details && details.status === 'REVISION_REQUESTED';
  const editable = details?.status === 'DRAFT' || (correcting && !!lifecycle?.canCorrect);
  const refreshStatus = async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      const updated = await currentApplication();
      const permissions =
        updated && updated.status === 'REVISION_REQUESTED' ? await ownerLifecycle() : null;
      setDetails(updated);
      setLifecycle(permissions);
      // Preserve unsaved form values when checking a new review outcome.
      await invalidateLifecycle(queryClient);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not refresh application status.'
      );
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  return (
    <div className='space-y-6 [&_input]:rounded-md [&_input]:bg-background [&_input]:shadow-none [&_select]:rounded-md [&_textarea]:rounded-md'>
      {details && (
        <nav aria-label={tr('Business application')} className='flex flex-wrap gap-2 rounded-2xl border bg-card p-2'>
          {([
            ['organizer-application-progress', 'Application progress', ClipboardCheck],
            ['organizer-application-form', 'Business details', Building2],
            ['organizer-verification-documents', 'Verification documents', Files]
          ] as const).map(([target, label, Icon]) => (
            <a key={target} href={`#${target}`} className='inline-flex min-h-10 flex-1 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-indigo-500/10 focus-visible:ring-2 focus-visible:ring-ring'>
              <Icon className='size-4 shrink-0 text-indigo-600 dark:text-indigo-300' aria-hidden='true' />
              {tr(label)}
              <ArrowDown className='ml-auto size-3 shrink-0 text-muted-foreground' aria-hidden='true' />
            </a>
          ))}
        </nav>
      )}
      {details ? (
        <section
          id='organizer-application-progress'
          aria-label='Application status and review feedback'
          className='scroll-mt-24 rounded-2xl border bg-card p-5 shadow-sm sm:p-6'
        >
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <span className='flex size-11 items-center justify-center rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-600 dark:text-indigo-300'>
                <ClipboardCheck className='size-5' aria-hidden='true' />
              </span>
              <div>
                <h2 className='text-lg font-semibold'>{tr('Application progress')}</h2>
                <p className='text-xs text-muted-foreground'>
                  {tr('Application #')}
                  {details.id}
                </p>
              </div>
            </div>
            <Badge
              variant={details.status === 'REJECTED' ? 'destructive' : 'secondary'}
              className='rounded-md px-3 py-1'
            >
              {tr(applicationStatusPresentation(details.status).label)}
            </Badge>
          </div>
          <p role='status' className='mt-4 text-sm leading-6 text-muted-foreground'>
            {tr(applicationStatusPresentation(details.status).description)}
          </p>
          {details.status !== 'DRAFT' && <div className='mt-5 grid gap-4 rounded-xl border bg-muted/20 p-4 text-sm sm:grid-cols-2'>
            <div>
              <p className='text-xs text-muted-foreground'>{tr('Submitted at')}</p>
              <p className='mt-1 font-medium'>
                {details.submittedAt
                  ? applicationTimestamp(details.submittedAt)
                  : tr('Not submitted yet')}
              </p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>{tr('Reviewed at')}</p>
              <p className='mt-1 font-medium'>
                {details.reviewedAt
                  ? applicationTimestamp(details.reviewedAt)
                  : tr('Awaiting review')}
              </p>
            </div>
          </div>}
          {(correcting || details.status === 'REJECTED') && (
            <div className='border-border bg-background mt-6 overflow-hidden rounded-xl border'>
              <div className='border-border bg-muted/25 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5'>
                <div className='flex items-center gap-3'>
                  <span className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg'>
                    <MessageSquareText className='size-4' />
                  </span>
                  <div>
                    <h3 className='text-sm font-semibold'>{tr('Review feedback')}</h3>
                    {correcting && (
                      <p className='text-muted-foreground mt-0.5 text-xs'>
                        {businessTypes.language === 'vi'
                          ? 'Chọn giấy tờ bên dưới để chuyển tới đúng chỗ cần sửa.'
                          : 'Select a document below to jump to its correction.'}
                      </p>
                    )}
                  </div>
                </div>
                {correcting && requestedDocuments.length > 0 && (
                  <Badge variant='secondary' className='gap-1.5 px-2.5 py-1'>
                    <span className='bg-primary size-1.5 rounded-full' />
                    {requestedDocuments.length}{' '}
                    {businessTypes.language === 'vi' ? 'giấy tờ cần sửa' : 'documents to update'}
                  </Badge>
                )}
              </div>
              <div
                className={
                  correcting && requestedDocuments.length
                    ? 'grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'
                    : 'p-4 sm:p-5'
                }
              >
                <div className='min-w-0'>
                  <p className='text-muted-foreground mb-2 text-xs font-medium'>
                    {businessTypes.language === 'vi' ? 'Nhận xét chung' : 'Overall feedback'}
                  </p>
                  {correcting ? (
                    <button
                      type='button'
                      className='border-primary/40 hover:border-primary hover:bg-primary/5 block w-full whitespace-pre-wrap break-words rounded-r-md border-l-2 py-1 pr-2 pl-3 text-left text-sm leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                      onClick={() => jumpToDocument(requestedDocuments[0]?.id)}
                    >
                      {details.reviewFeedback || tr('No feedback recorded.')}
                    </button>
                  ) : (
                    <p className='whitespace-pre-wrap break-words text-sm leading-6'>
                      {details.reviewFeedback || tr('No feedback recorded.')}
                    </p>
                  )}
                </div>
                {correcting && requestedDocuments.length > 0 && (
                  <div className='space-y-2.5'>
                    {requestedDocuments.map((document, index) => (
                      <button
                        key={document.id}
                        type='button'
                        className='group border-border bg-card hover:border-primary/40 hover:bg-primary/5 flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4'
                        onClick={() => jumpToDocument(document.id)}
                      >
                        <span className='bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors'>
                          <FileText className='size-5' />
                        </span>
                        <span className='min-w-0 flex-1'>
                          <span className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                            <span className='text-muted-foreground text-[11px] font-medium'>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className='text-sm font-semibold'>
                              {tr(DOCUMENT_LABELS[document.documentType])}
                            </span>
                          </span>
                          <span className='text-muted-foreground mt-1 block truncate text-xs'>
                            {document.fileName}
                          </span>
                          <span className='mt-2 block whitespace-pre-wrap break-words text-sm leading-5'>
                            {document.adminFeedback}
                          </span>
                          <span className='text-primary bg-primary/10 mt-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium'>
                            {businessTypes.language === 'vi' ? 'Đến tài liệu' : 'Go to document'}
                            <ArrowDownRight className='size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5' />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className='border-border text-muted-foreground flex items-start gap-2 border-t px-4 py-3 text-xs leading-5 sm:px-5'>
                <LockKeyhole className='mt-0.5 size-3.5 shrink-0' />
                <span>
                  {tr(
                    correcting
                      ? 'Only replace the documents requested by the administrator, then resubmit. Business information is read-only.'
                      : 'This application was rejected. Editing and resubmission are unavailable.'
                  )}
                </span>
              </div>
            </div>
          )}
          {details.status === 'APPROVED' && (
            <div className='mt-5'>
              <OwnerLifecycleStatus actorId={user.id} />
            </div>
          )}
          <Button
            type='button'
            variant='outline'
            className='mt-5 rounded-md'
            disabled={busy}
            onClick={() => void refreshStatus()}
          >
            <RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} aria-hidden='true' />{' '}
            {tr('Refresh status')}{' '}
          </Button>
          {details.status === 'REJECTED' && (
            <Button type='button' className='mt-5 ml-2' disabled={busy} onClick={() => void run('start')}>
              {businessTypes.language === 'vi' ? 'Đăng ký lại' : 'Start a new application'}
            </Button>
          )}
          {history.data?.some((item) => item.id !== details.id) && (
            <details className='mt-5 border-t pt-4'>
              <summary className='cursor-pointer text-sm font-medium'>
                {businessTypes.language === 'vi' ? 'Lịch sử đơn bị từ chối' : 'Rejected application history'}
              </summary>
              <ul className='mt-3 space-y-2'>
                {history.data.filter((item) => item.id !== details.id).map((item) => (
                  <li key={item.id} className='rounded-lg border p-3 text-sm'>
                    <p className='font-medium'>#{item.id} · {item.legalName}</p>
                    {item.reviewedAt && <p className='text-muted-foreground'>{item.reviewedAt.replace('T', ' ')} UTC</p>}
                    <p className='mt-1 whitespace-pre-wrap'>{item.reviewFeedback}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      ) : (
        <section className='space-y-4 rounded-lg border bg-card p-6 shadow-sm'>
          <p>
            {tr(
              'Start a draft, save your business details and upload a business license. Submit only when ready for review.'
            )}{' '}
          </p>
          <Button disabled={busy} onClick={() => void run('start')}>
            {busy ? tr('Starting…') : tr('Start draft application')}
          </Button>
        </section>
      )}
      {details && ['CONTRACT_PENDING', 'APPROVED'].includes(details.status) && (
        <ContractPanel
          key={`contract-${user.id}`}
          onSigned={() => {
            void refreshStatus();
          }}
        />
      )}
      {details && (
        <>
          <form
            id='organizer-application-form'
            noValidate
            className='scroll-mt-24 space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-7'
            onSubmit={(event) => {
              event.preventDefault();
              if (editable) void run('save');
            }}
          >
            <div className='flex items-center gap-3 border-b pb-5'>
              <span className='flex size-11 items-center justify-center rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-600 dark:text-indigo-300'>
                <Building2 className='size-5' aria-hidden='true' />
              </span>
              <div>
                <h2 className='text-lg font-semibold'>{tr('Business details')}</h2>
                <p className='break-all text-xs text-muted-foreground'>
                  {tr('Signed in as')} {user.email}
                </p>
              </div>
            </div>
            <fieldset
              disabled={details?.status !== 'DRAFT' || busy}
              className='grid gap-5 sm:grid-cols-2 disabled:opacity-70'
            >
              <legend className='sr-only'>{tr('Business application')}</legend>
              <p className='text-muted-foreground text-xs sm:col-span-2'>
                <span className='text-destructive'>*</span> {tr('Required when submitting')}
              </p>
              <div className='space-y-2 sm:col-span-2'>
                <label htmlFor='businessType' className='text-sm font-medium'>
                  {businessTypes.language === 'vi' ? 'Loại hình kinh doanh' : tr('Business type')}
                  <span aria-hidden='true' className='ml-1 text-destructive'>*</span>
                </label>
                <select
                  id='businessType'
                  {...form.register('businessType')}
                  disabled={!availableBusinessTypes.length}
                  aria-required='true'
                  className='h-10 w-full rounded-md border border-input bg-background px-3'
                >
                  {!availableBusinessTypes.length && !legacyBusinessType && (
                    <option value={form.getValues('businessType')}>
                      {businessTypes.query.isError
                        ? tr('Could not load business types')
                        : tr('Loading business types…')}
                    </option>
                  )}
                  {legacyBusinessType && (
                    <option value='OTHER' disabled>{businessTypes.label('OTHER')}</option>
                  )}
                  {availableBusinessTypes.map((option) => (
                    <option key={option.code} value={option.code}>
                      {businessTypes.label(option.code)}
                    </option>
                  ))}
                </select>
                <p className='text-muted-foreground text-xs leading-5'>
                  {businessTypes.language === 'vi'
                    ? 'Chọn đúng loại hình trên giấy đăng ký.'
                    : 'Match the type on your registration document.'}
                </p>
                {details.status === 'DRAFT' && selectedBusinessType !== details.businessType && (
                  <p className='text-primary text-xs'>
                    {businessTypes.language === 'vi'
                      ? 'Lưu thay đổi loại hình trước khi bổ sung giấy tờ theo checklist mới.'
                      : 'Save the business type change before adding documents required by the new checklist.'}
                  </p>
                )}
                {businessTypes.query.isError && (
                  <div role='alert' className='space-y-2'>
                    <p>{tr(businessTypes.query.error.message)}</p>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => void businessTypes.query.refetch()}
                    >
                      {tr('Reload business types')}{' '}
                    </Button>
                  </div>
                )}
                {form.formState.errors.businessType && (
                  <p role='alert'>{tr(form.formState.errors.businessType.message)}</p>
                )}
              </div>
              {fields.map(([name, label, maxLength]) => (
                <div
                  key={name}
                  className={`space-y-2 ${name === 'address' ? 'sm:col-span-2' : ''}`}
                >
                  <label htmlFor={name} className='text-sm font-medium'>
                    {tr(name === 'taxId' && !legacyBusinessType
                      ? householdBusiness ? 'Representative’s personal identification number' : 'Business tax ID'
                      : label)}
                    <span aria-hidden='true' className='ml-1 text-destructive'>*</span>
                  </label>
                  <Input
                    id={name}
                    type={
                      name === 'contactEmail' ? 'email' : name === 'contactPhone' ? 'tel' : 'text'
                    }
                    maxLength={maxLength}
                    inputMode={name === 'taxId' && !legacyBusinessType ? 'numeric' : undefined}
                    aria-required='true'
                    {...form.register(name, name === 'taxId' ? { onBlur: checkTaxId, onChange: () => {
                      if (form.getFieldState('taxId').error?.type === 'taxIdFormat') checkTaxId();
                    } } : undefined)}
                    onKeyDown={name === 'taxId' ? (event) => {
                      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                      event.preventDefault();
                      checkTaxId();
                    } : undefined}
                    aria-invalid={!!form.formState.errors[name]}
                    aria-describedby={form.formState.errors[name] ? `${name}-error` : undefined}
                  />
                  {name === 'taxId' && !legacyBusinessType && !form.formState.errors.taxId && (
                    <p className='text-muted-foreground text-xs'>{tr(householdBusiness ? '12 digits' : '10 digits')}</p>
                  )}
                  {form.formState.errors[name] && (
                    <p id={`${name}-error`} role='alert' className='text-sm text-red-600'>
                      {tr(form.formState.errors[name]?.message)}
                    </p>
                  )}
                </div>
              ))}
              <div className='space-y-2 sm:col-span-2'>
                <label htmlFor='registrationReason' className='text-sm font-medium'>
                  {tr('Registration reason')}{' '}
                  <span aria-hidden='true' className='text-destructive'>*</span>
                </label>
                <textarea
                  id='registrationReason'
                  maxLength={2000}
                  rows={5}
                  aria-required='true'
                  {...form.register('registrationReason')}
                  aria-invalid={!!form.formState.errors.registrationReason}
                  aria-describedby={
                    form.formState.errors.registrationReason
                      ? 'registrationReason-help registrationReason-error'
                      : 'registrationReason-help'
                  }
                  className='w-full rounded-md border border-input bg-background p-3 text-sm'
                />
                <p id='registrationReason-help' className='text-sm text-muted-foreground'>
                  {tr(
                    'Explain why you want to become an Organizer. Optional while saving; required when submitting or resubmitting. Maximum 2,000 characters.'
                  )}{' '}
                </p>
                {form.formState.errors.registrationReason && (
                  <p id='registrationReason-error' role='alert' className='text-sm text-red-600'>
                    {tr(form.formState.errors.registrationReason.message)}
                  </p>
                )}
              </div>
            </fieldset>
            {editable && (
              <p className='text-sm text-muted-foreground'>
                {correcting
                  ? tr('Review all corrections before resubmitting.')
                  : tr('Drafts may be incomplete.')}{' '}
                {tr(
                  'Complete all required business fields and the document checklist before submitting. Uploading does not submit the application.'
                )}{' '}
              </p>
            )}
          </form>
          {!editable && (
            <p>
              {tr(
                'This application is read-only. Only applications with requested changes can be corrected. Rejected applications cannot be edited or resubmitted.'
              )}{' '}
            </p>
          )}
        </>
      )}

      {details && (
        <section
          id='organizer-verification-documents'
          aria-label={tr('Verification documents')}
          className='scroll-mt-24 space-y-4'
        >
          {editable && (
            <DocumentRequirementsChecklist actorId={user.id} businessType={selectedBusinessType} revisionRequested={correcting} />
          )}
          <div className='flex items-center gap-3 rounded-xl border bg-card px-4 py-3'>
            <Files className='size-5 text-indigo-600 dark:text-indigo-300' aria-hidden='true' />
            <div>
              <h2 className='text-lg font-semibold'>{tr('Verification documents')}</h2>
              <p className='text-sm text-muted-foreground'>
                {tr(
                  'Upload your files here. Required documents depend on the selected business type.'
                )}{' '}
              </p>
            </div>
          </div>
          {details.status === 'DRAFT' ? (
            <DraftVerificationDocuments
              businessType={selectedBusinessType}
              actorId={user.id}
              disabled={busy}
              onBusyChange={(value) => {
                operation.current = value;
                setBusy(value);
              }}
            />
          ) : correcting && lifecycle ? (
            <CorrectionDocuments
              businessType={details.businessType}
              actorId={user.id}
              context={lifecycle}
              focusRequest={focusRequest}
              disabled={busy}
              onUpdated={setLifecycle}
              onBusyChange={(value) => {
                operation.current = value;
                setBusy(value);
              }}
            />
          ) : (
            details && <VerificationDocumentsView />
          )}
        </section>
      )}
      {editable && (
        <div className='flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5'>
          <p className='max-w-md text-sm text-muted-foreground'>
            {tr(
              'Save your progress at any time. Submit only when your details and documents are ready.'
            )}{' '}
          </p>
          <div className='flex flex-wrap gap-3'>
            {!correcting && (
              <Button
                type='submit'
                form='organizer-application-form'
                variant='outline'
                className='rounded-md'
                disabled={busy || !availableBusinessTypes.length}
              >
                {busy ? tr('Saving…') : tr('Save draft')}
              </Button>
            )}
            <Button
              type='button'
              className='rounded-md bg-primary text-primary-foreground hover:bg-primary/90'
              disabled={busy || !availableBusinessTypes.length}
              onClick={() => (correcting ? setConfirmResubmit(true) : void run('submit'))}
            >
              {correcting ? tr('Resubmit for review') : tr('Submit for review')}
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={confirmResubmit}
        onOpenChange={(value) => {
          if (!busy) setConfirmResubmit(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr('Resubmit your application?')}</DialogTitle>
            <DialogDescription>
              {tr(
                'Only the requested document replacements will be sent for review. Business information remains unchanged. Uploads will be locked after resubmission.'
              )}{' '}
            </DialogDescription>
          </DialogHeader>
          {error === 'This tax ID belongs to an approved or contract-pending Organizer' && (
            <div role='alert' className='rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm'>
              <p className='font-medium text-destructive'>{tr(error)}</p>
              <p className='mt-1 text-muted-foreground'>
                {tr('Contact the reviewer. If the tax ID on this application is incorrect, ask the reviewer to reject it so you can start a new application with the correct tax ID.')}
              </p>
            </div>
          )}
          <div className='flex justify-end gap-3'>
            <Button variant='outline' disabled={busy} onClick={() => setConfirmResubmit(false)}>
              {tr('Cancel')}{' '}
            </Button>
            <Button disabled={busy} onClick={() => void run('submit')}>
              {busy ? tr('Submitting…') : tr('Confirm resubmission')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
