import { useRef, useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { useBusinessTypes } from '@/features/organizer-application/hooks/use-business-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  businessContactSchema,
  businessProfileMutationOptions,
  businessProfileQueryOptions
} from '../api/profile';
import type { BusinessContactInput, OrganizerBusinessProfile } from '../api/profile';

const emptySubscribe = () => () => {};

export function BusinessProfileView() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.accessToken);
  const actorId = user?.id ?? 0;
  const allowed = !!token && !!user && getUserRole(user) === 'ORGANIZER';
  const query = useQuery({ ...businessProfileQueryOptions(actorId), enabled: mounted && allowed });

  if (!mounted) return <p role='status'>Loading business profile…</p>;
  if (!allowed)
    return <p role='alert'>Sign in with an Organizer account to access your business profile.</p>;
  if (query.isPending) return <p role='status'>Loading business profile…</p>;
  if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : undefined;
    return (
      <div className='space-y-3' role='alert'>
        <p>{query.error.message || 'Could not load your business profile.'}</p>
        {status === 401 ? (
          <Link to='/auth/sign-in' className='text-primary underline'>
            Sign in again
          </Link>
        ) : status !== 403 && status !== 404 && status !== 409 ? (
          <Button onClick={() => void query.refetch()}>Try again</Button>
        ) : null}
      </div>
    );
  }

  return (
    <BusinessContactForm
      key={`${actorId}:${query.data.id}`}
      actorId={actorId}
      profile={query.data}
    />
  );
}

function BusinessContactForm({
  profile,
  actorId
}: {
  profile: OrganizerBusinessProfile;
  actorId: number;
}) {
  const businessTypes = useBusinessTypes();
  const queryClient = useQueryClient();
  const mutation = useMutation(businessProfileMutationOptions(queryClient, actorId));
  const submitting = useRef(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const form = useForm<BusinessContactInput>({
    resolver: zodResolver(businessContactSchema),
    defaultValues: contactValues(profile)
  });
  const legalFields = [
    ['legalName', 'Legal business name', profile.legalName],
    ['businessType', 'Business type', businessTypes.label(profile.businessType)],
    ['taxId', 'Tax ID', profile.taxId],
    ['representativeName', 'Legal representative', profile.representativeName]
  ] as const;
  const fields = [
    ['address', 'Business address', 500],
    ['contactEmail', 'Contact email', 255],
    ['contactPhone', 'Contact phone', 20]
  ] as const;

  const onSubmit = async (input: BusinessContactInput) => {
    if (submitting.current) return;
    submitting.current = true;
    setFeedback(null);
    try {
      const updated = await mutation.mutateAsync(input);
      form.reset(contactValues(updated));
      setFeedback({ error: false, message: 'Business contact details updated successfully.' });
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.validationErrors ?? {})) {
          if (field in businessContactSchema.shape)
            form.setError(field as keyof BusinessContactInput, { message });
        }
        if (error.status === 403 || error.status === 409) {
          // Approval or account eligibility may have changed while the form was open.
          void queryClient.invalidateQueries({
            queryKey: businessProfileQueryOptions(actorId).queryKey,
            exact: true
          });
        }
      }
      setFeedback({
        error: true,
        message:
          error instanceof Error
            ? error.message
            : 'Could not save your business profile. Please try again.'
      });
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business profile</CardTitle>
        <CardDescription>
          Update the contact details of your approved business. Legal identity is read-only and
          approval remains unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
          className='space-y-6'
        >
          <div className='grid gap-5 sm:grid-cols-2'>
            {legalFields.map(([name, label, value]) => (
              <div key={name} className='space-y-2'>
                <label htmlFor={`business-${name}`} className='text-sm font-medium'>
                  {label}
                </label>
                <Input id={`business-${name}`} value={value ?? ''} readOnly className='bg-muted' />
              </div>
            ))}
          </div>
          <fieldset
            disabled={mutation.isPending}
            className='grid gap-5 sm:grid-cols-2 disabled:opacity-70'
          >
            <legend className='sr-only'>Business contact details</legend>
            {fields.map(([name, label, maxLength]) => (
              <div key={name} className={`space-y-2 ${name === 'address' ? 'sm:col-span-2' : ''}`}>
                <label htmlFor={`business-${name}`} className='text-sm font-medium'>
                  {label}
                </label>
                <Input
                  id={`business-${name}`}
                  type={
                    name === 'contactEmail' ? 'email' : name === 'contactPhone' ? 'tel' : 'text'
                  }
                  maxLength={maxLength}
                  {...form.register(name)}
                  aria-required='true'
                  aria-invalid={!!form.formState.errors[name]}
                  aria-describedby={
                    form.formState.errors[name] ? `business-${name}-error` : undefined
                  }
                />
                {form.formState.errors[name] ? (
                  <p
                    id={`business-${name}-error`}
                    role='alert'
                    className='text-sm text-destructive'
                  >
                    {form.formState.errors[name]?.message}
                  </p>
                ) : null}
              </div>
            ))}
          </fieldset>
          {feedback ? (
            <p
              role={feedback.error ? 'alert' : 'status'}
              className={
                feedback.error ? 'text-destructive' : 'text-emerald-700 dark:text-emerald-400'
              }
            >
              {feedback.message}
            </p>
          ) : null}
          <div className='flex flex-wrap gap-3'>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={mutation.isPending}
              onClick={() => {
                form.reset(contactValues(profile));
                setFeedback(null);
              }}
            >
              Cancel changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function contactValues(profile: OrganizerBusinessProfile): BusinessContactInput {
  return {
    address: profile.address ?? '',
    contactEmail: profile.contactEmail ?? '',
    contactPhone: profile.contactPhone ?? ''
  };
}
