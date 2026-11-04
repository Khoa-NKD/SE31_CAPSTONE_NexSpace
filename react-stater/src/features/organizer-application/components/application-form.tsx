import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiError } from '@/lib/api-client';
import { currentUser } from '@/features/auth/api/session';
import type { SessionUser } from '@/features/auth/api/session';
import { BUSINESS_TYPES, submitApplication } from '../api/application';
import type { ApplicationInput } from '../api/application';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const schema = z.object({
  legalName: z.string().trim().min(1, 'Legal name is required').max(255),
  businessType: z.enum([
    'JOINT_STOCK',
    'LIMITED_LIABILITY',
    'SOLE_PROPRIETOR',
    'HOUSEHOLD_BUSINESS',
    'OTHER'
  ]),
  taxId: z.string().trim().min(1, 'Tax ID is required').max(50),
  representativeName: z.string().trim().min(1, 'Representative is required').max(100),
  address: z.string().trim().min(1, 'Address is required').max(500),
  contactPhone: z
    .string()
    .trim()
    .regex(/^[+0-9() .-]{8,20}$/, 'Enter a valid phone number (8–20 characters)'),
  contactEmail: z.string().trim().email('Enter a valid email address').max(255)
});

const fields = [
  ['legalName', 'Legal business name', 255],
  ['taxId', 'Tax ID', 50],
  ['representativeName', 'Legal representative', 100],
  ['address', 'Business address', 500],
  ['contactPhone', 'Contact phone', 20],
  ['contactEmail', 'Contact email', 255]
] as const;

export function ApplicationForm() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [license, setLicense] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const submitting = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useForm<ApplicationInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      legalName: '',
      businessType: 'LIMITED_LIABILITY',
      taxId: '',
      representativeName: '',
      address: '',
      contactPhone: '',
      contactEmail: ''
    }
  });
  const mutation = useMutation({
    mutationFn: ({ input, file }: { input: ApplicationInput; file: File }) =>
      submitApplication(input, file)
  });

  useEffect(() => {
    const controller = new AbortController();
    currentUser(controller.signal)
      .then((account) => {
        setUser(account);
        form.setValue('contactEmail', account.email);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setAccessError(error instanceof Error ? error.message : 'Could not verify your account.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [form]);

  const onSubmit = async (input: ApplicationInput) => {
    if (submitting.current || mutation.isSuccess) return;
    if (!license) {
      setFileError('A business license is required.');
      return;
    }
    submitting.current = true;
    setSubmitError('');
    try {
      await mutation.mutateAsync({ input, file: license });
      form.reset();
      setLicense(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.validationErrors ?? {})) {
          if (field in schema.shape) form.setError(field as keyof ApplicationInput, { message });
        }
        if (error.status === 401 || error.status === 403) setAccessError(error.message);
      }
      setSubmitError(
        error instanceof Error ? error.message : 'Submission failed. Please try again.'
      );
    } finally {
      submitting.current = false;
    }
  };

  if (checking) return <p role='status'>Checking your account…</p>;
  if (accessError || !user)
    return (
      <div className='space-y-4' role='alert'>
        <p>{accessError || 'Please sign in to apply.'}</p>
        <Link to='/auth/sign-in' className='text-indigo-600 underline'>
          Sign in
        </Link>
      </div>
    );
  if (!user.verified || user.status !== 'ACTIVE' || !['USER', 'ORGANIZER'].includes(user.role ?? '')) {
    return (
      <p role='alert'>
        An active, email-verified Customer or Organizer account is required to apply.
      </p>
    );
  }
  if (mutation.isSuccess)
    return (
      <div
        role='status'
        className='space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6'
      >
        <h2 className='text-xl font-semibold'>Application submitted</h2>
        <p>Application #{mutation.data.id} is pending administrator review.</p>
        <p>Your account permissions will change only after approval.</p>
        <Link to='/' className='text-indigo-600 underline'>
          Return home
        </Link>
      </div>
    );

  return (
    <form
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
      noValidate
      className='space-y-6'
    >
      <p className='text-sm text-muted-foreground'>
        Signed in as {user.email}. All fields are required.
      </p>
      <fieldset
        disabled={mutation.isPending}
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
            aria-invalid={!!form.formState.errors.businessType}
            className='h-10 w-full rounded-md border border-input bg-background px-3'
          >
            {BUSINESS_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {form.formState.errors.businessType && (
            <p role='alert' className='text-sm text-red-600'>
              {form.formState.errors.businessType.message}
            </p>
          )}
        </div>
        {fields.map(([name, label, maxLength]) => (
          <div key={name} className={`space-y-2 ${name === 'address' ? 'sm:col-span-2' : ''}`}>
            <label htmlFor={name} className='text-sm font-medium'>
              {label}
            </label>
            <Input
              id={name}
              type={name === 'contactEmail' ? 'email' : name === 'contactPhone' ? 'tel' : 'text'}
              maxLength={maxLength}
              {...form.register(name)}
              aria-required='true'
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
        <div className='space-y-2 sm:col-span-2'>
          <label htmlFor='businessLicense' className='text-sm font-medium'>
            Business license
          </label>
          <Input
            ref={fileInput}
            id='businessLicense'
            type='file'
            accept='.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf'
            aria-required='true'
            aria-invalid={!!fileError}
            aria-describedby='license-help license-error'
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setLicense(null);
              setFileError('');
              if (!file) return;
              if (
                !/\.(jpe?g|png|pdf)$/i.test(file.name) ||
                !['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) ||
                !file.size ||
                file.size > 5 * 1024 * 1024
              ) {
                setFileError('Choose a JPG, PNG or PDF file between 1 byte and 5 MB.');
                event.target.value = '';
                return;
              }
              setLicense(file);
            }}
          />
          <p id='license-help' className='text-sm text-muted-foreground'>
            JPG, PNG or PDF, up to 5 MB. Verification documents are stored privately.
          </p>
          <p
            id='license-error'
            role={fileError ? 'alert' : undefined}
            className='text-sm text-red-600'
          >
            {fileError}
          </p>
        </div>
      </fieldset>
      {submitError && (
        <p role='alert' className='rounded-md border border-red-500/30 p-3 text-sm text-red-600'>
          {submitError}
        </p>
      )}
      <Button type='submit' disabled={mutation.isPending} className='w-full sm:w-auto'>
        {mutation.isPending ? 'Submitting…' : 'Submit application'}
      </Button>
    </form>
  );
}
