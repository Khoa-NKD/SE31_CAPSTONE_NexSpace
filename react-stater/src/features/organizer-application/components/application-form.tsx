import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api-client';
import { currentUser } from '@/features/auth/api/session';
import type { SessionUser } from '@/features/auth/api/session';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { VerificationDocumentsView } from '@/features/organizer-verification-documents/components/verification-documents-view';
import { verificationDocumentKeys } from '@/features/organizer-verification-documents/api/documents';
import {
  BUSINESS_TYPES,
  applicationDraftSchema,
  currentApplication,
  startApplicationDraft,
  saveApplicationDraft,
  submitApplicationDraft
} from '../api/application';
import type { ApplicationInput, ApplicationDetails } from '../api/application';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    contactEmail: details?.contactEmail ?? email
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
  const [user, setUser] = useState<SessionUser | null>(null);
  const [details, setDetails] = useState<ApplicationDetails | null>(null);
  const [checking, setChecking] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const queryClient = useQueryClient();
  const form = useForm<ApplicationInput>({ defaultValues: formValues(null) });
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    const controller = new AbortController();
    void currentUser(controller.signal)
      .then(async (account) => {
        if (controller.signal.aborted) return;
        setUser(account);
        const application = await currentApplication(controller.signal);
        if (controller.signal.aborted) return;
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
      if (action === 'start') {
        const draft = await startApplicationDraft();
        setDetails(draft);
        form.reset(formValues(draft, user?.email));
        setFeedback('Draft created. Save your details and upload your business license below.');
      } else {
        // Both actions persist the visible snapshot; only explicit submission changes status.
        const parsed = applicationDraftSchema.safeParse(form.getValues());
        if (!parsed.success) {
          for (const issue of parsed.error.issues)
            form.setError(issue.path[0] as keyof ApplicationInput, { message: issue.message });
          setError('Correct the highlighted fields before saving or submitting.');
          return;
        }
        const saved = await saveApplicationDraft(parsed.data);
        setDetails(saved);
        form.reset(formValues(saved));
        if (action === 'submit') {
          const receipt = await submitApplicationDraft();
          setDetails({ ...saved, ...receipt });
          setFeedback(
            'Application submitted. Your account permissions change only after approval.'
          );
        } else
          setFeedback('Draft saved. You can return later; it has not been submitted for review.');
      }
      if (user)
        await queryClient.invalidateQueries({
          queryKey: verificationDocumentKeys.detail(user.id),
          exact: true
        });
    } catch (failure) {
      if (failure instanceof ApiError) {
        for (const [field, message] of Object.entries(failure.validationErrors ?? {})) {
          if (field === 'businessType' || fields.some(([name]) => name === field))
            form.setError(field as keyof ApplicationInput, { message });
        }
        if ([401, 403].includes(failure.status)) setAccessError(failure.message);
        if (failure.status === 409) {
          // Refresh status without replacing unsaved text; another tab may have submitted.
          try {
            setDetails(await currentApplication());
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

  if (checking) return <p role='status'>Loading your application…</p>;
  if (loadError)
    return (
      <div role='alert' className='space-y-3'>
        <p>{loadError}</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    );
  if (accessError || !user)
    return (
      <div role='alert' className='space-y-3'>
        <p>{accessError || 'Please sign in to apply.'}</p>
        <Link to='/auth/sign-in' className='text-primary underline'>
          Sign in
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
        An active, email-verified Customer or Organizer account is required to apply.
      </p>
    );

  const editable = details?.status === 'DRAFT';
  return (
    <div className='space-y-6'>
      <p className='text-sm text-muted-foreground'>Signed in as {user.email}.</p>
      {details ? (
        <p role='status'>
          Application #{details.id} · {details.status}
        </p>
      ) : (
        <>
          <p>
            Start a draft, save your business details and upload a business license. Submit only
            when ready for review.
          </p>
          <Button disabled={busy} onClick={() => void run('start')}>
            {busy ? 'Starting…' : 'Start draft application'}
          </Button>
        </>
      )}
      {details && (
        <>
          <form
            noValidate
            className='space-y-5'
            onSubmit={(event) => {
              event.preventDefault();
              if (editable) void run('save');
            }}
          >
            <fieldset
              disabled={!editable || busy}
              className='grid gap-5 sm:grid-cols-2 disabled:opacity-70'
            >
              <legend className='sr-only'>Business application</legend>
              <div className='space-y-2 sm:col-span-2'>
                <label htmlFor='businessType' className='text-sm font-medium'>
                  Business type
                </label>
                <select
                  id='businessType'
                  {...form.register('businessType')}
                  className='h-10 w-full rounded-md border border-input bg-background px-3'
                >
                  {BUSINESS_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.businessType && (
                  <p role='alert'>{form.formState.errors.businessType.message}</p>
                )}
              </div>
              {fields.map(([name, label, maxLength]) => (
                <div
                  key={name}
                  className={`space-y-2 ${name === 'address' ? 'sm:col-span-2' : ''}`}
                >
                  <label htmlFor={name} className='text-sm font-medium'>
                    {label}
                  </label>
                  <Input
                    id={name}
                    type={
                      name === 'contactEmail' ? 'email' : name === 'contactPhone' ? 'tel' : 'text'
                    }
                    maxLength={maxLength}
                    {...form.register(name)}
                    aria-invalid={!!form.formState.errors[name]}
                    aria-describedby={form.formState.errors[name] ? `${name}-error` : undefined}
                  />
                  {form.formState.errors[name] && (
                    <p id={`${name}-error`} role='alert' className='text-sm text-red-600'>
                      {form.formState.errors[name]?.message}
                    </p>
                  )}
                </div>
              ))}
            </fieldset>
            {editable && (
              <div className='flex flex-wrap gap-3'>
                <Button type='submit' disabled={busy}>
                  {busy ? 'Saving…' : 'Save draft'}
                </Button>
                <Button type='button' disabled={busy} onClick={() => void run('submit')}>
                  Submit for review
                </Button>
              </div>
            )}
            {editable && (
              <p className='text-sm text-muted-foreground'>
                Drafts may be incomplete. All business fields and a current business license are
                required for submission. Uploading does not submit the application.
              </p>
            )}
          </form>
          {!editable && (
            <p>
              This application is read-only here. Upload is available only for DRAFT or
              REVISION_REQUESTED profiles.
            </p>
          )}
        </>
      )}
      {feedback && (
        <p role='status' className='text-sm text-emerald-700'>
          {feedback}
        </p>
      )}
      {error && (
        <p role='alert' className='text-sm text-red-600'>
          {error}
        </p>
      )}
      {details && <VerificationDocumentsView />}
    </div>
  );
}
