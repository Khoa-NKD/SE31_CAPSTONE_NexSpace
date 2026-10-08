import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useAppForm } from '@/lib/form';
import { useTransition } from 'react';
import { toast } from 'sonner';
import * as z from 'zod';
import GoogleSignInButton from './google-auth-button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Link } from '@tanstack/react-router';

const signUpSchema = z
  .object({
    fullName: z.string().min(2, { message: 'Full name is required' }),
    email: z.string().email({ message: 'Enter a valid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z.string(),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and policies'
    }),
    subscribe: z.boolean()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

function getPasswordStrength(password: string) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z\d]/.test(password)) score += 1;
  return score;
}

const getColor = (s: number) => {
  if (s === 0) return 'bg-border';
  if (s === 1) return 'bg-red-500';
  if (s === 2) return 'bg-orange-500';
  if (s === 3) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const getLabel = (s: number, t: (k: string) => string) => {
  if (s === 0) return '';
  if (s === 1) return t('auth.signUp.strength.weak');
  if (s === 2) return t('auth.signUp.strength.fair');
  if (s === 3) return t('auth.signUp.strength.good');
  return t('auth.signUp.strength.strong');
};

function PasswordStrengthMeter({
  password,
  t
}: {
  password?: string;
  t: (k: string) => string;
}) {
  const score = getPasswordStrength(password || '');

  if (!password) return null;

  return (
    <div className='mt-2 flex flex-col gap-1.5'>
      <div className='flex gap-1'>
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
              idx <= score ? getColor(score) : 'bg-secondary'
            }`}
          />
        ))}
      </div>
      <p
        className={`text-[11px] font-medium transition-colors duration-300 text-right ${
          score === 4
            ? 'text-emerald-600'
            : score === 3
              ? 'text-amber-600'
              : score === 2
                ? 'text-orange-600'
                : 'text-red-600'
        }`}
      >
        {getLabel(score, t)}
      </p>
    </div>
  );
}

import { useLanguage } from '../../landing/context/language-context';

export default function SignUpForm({ onSuccess }: { onSuccess?: (email: string) => void }) {
  const [loading, startTransition] = useTransition();
  const { t } = useLanguage();

  const form = useAppForm({
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
      subscribe: false
    },
    validators: {
      onSubmit: signUpSchema
    },
    onSubmit: ({ value }) => {
      startTransition(() => {
        toast.success('Account created successfully!');
        onSuccess?.(value.email);
      });
    }
  });

  return (
    <>
      <form
        className='w-full space-y-4'
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <FieldGroup>
          <form.AppField
            name='fullName'
            children={(field) => (
              <field.TextField
                label={t('auth.signUp.fullName')}
                placeholder={t('auth.signUp.fullName.ph')}
                disabled={loading}
              />
            )}
          />

          <form.AppField
            name='email'
            children={(field) => (
              <field.TextField
                label={t('auth.signUp.email')}
                type='email'
                placeholder={t('auth.signUp.email.ph')}
                disabled={loading}
              />
            )}
          />

          <form.AppField
            name='password'
            children={(field) => (
              <div className='flex w-full flex-col'>
                <field.TextField
                  label={t('auth.signUp.password')}
                  type='password'
                  placeholder={t('auth.signUp.password.ph')}
                  disabled={loading}
                />
                <PasswordStrengthMeter password={field.state.value as string} t={t} />
              </div>
            )}
          />

          <form.AppField
            name='confirmPassword'
            children={(field) => (
              <field.TextField
                label={t('auth.signUp.confirmPassword')}
                type='password'
                placeholder={t('auth.signUp.password.ph')}
                disabled={loading}
              />
            )}
          />

          <div className='flex flex-col gap-3 py-2'>
            <form.AppField
              name='agreeTerms'
              children={(field) => {
                // Ensure error message string extraction
                const errorObj = field.state.meta.errors;
                const errText =
                  errorObj && errorObj.length > 0
                    ? typeof errorObj[0] === 'string'
                      ? errorObj[0]
                      : (errorObj[0] as unknown as { message: string })?.message || 'Error'
                    : null;

                return (
                  <div className='flex items-start space-x-2'>
                    <Checkbox
                      className='cursor-pointer'
                      id='agreeTerms'
                      checked={field.state.value}
                      onCheckedChange={(checked) => field.handleChange(checked === true)}
                      disabled={loading}
                    />
                    <div className='grid gap-1.5 leading-none'>
                      <Label
                        htmlFor='agreeTerms'
                        className='text-muted-foreground text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                      >
                        {t('auth.signUp.agreeTerms.prefix')}{' '}
                        <Link
                          to='/terms-of-service'
                          className='text-foreground hover:text-indigo-600 underline-offset-4 transition-colors underline'
                        >
                          {t('auth.signUp.agreeTerms.tos')}
                        </Link>{' '}
                        {t('auth.signUp.agreeTerms.and')}{' '}
                        <Link
                          to='/privacy-policy'
                          className='text-foreground hover:text-indigo-600 underline-offset-4 transition-colors underline'
                        >
                          {t('auth.signUp.agreeTerms.privacy')}
                        </Link>
                      </Label>
                      {errText && (
                        <p className='text-destructive text-[0.8rem] font-medium'>{errText}</p>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            <form.AppField
              name='subscribe'
              children={(field) => (
                <div className='flex items-start space-x-2'>
                  <Checkbox
                    className='cursor-pointer'
                    id='subscribe'
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked === true)}
                    disabled={loading}
                  />
                  <div className='grid gap-1.5 leading-none'>
                    <Label
                      htmlFor='subscribe'
                      className='text-muted-foreground text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                    >
                      {t('auth.signUp.subscribe')}
                    </Label>
                  </div>
                </div>
              )}
            />
          </div>
        </FieldGroup>

        <Button
          disabled={loading}
          className='cursor-pointer mt-2 w-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-[#4338CA] text-white shadow-md shadow-indigo-500/20 transition-all duration-150 hover:from-indigo-500 hover:to-[#3730A3] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]'
          type='submit'
        >
          {t('auth.signUp.btn')}
        </Button>
      </form>

      <div className='relative py-2'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-background text-muted-foreground px-2'>
            {t('auth.signUp.orContinue')}
          </span>
        </div>
      </div>

      <GoogleSignInButton />
    </>
  );
}
