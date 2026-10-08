import React, { useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowRight, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import GoogleSignInButton from './google-auth-button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

// Schema validation
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean()
});

type SignInValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
  onSuccess?: () => void;
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  const onSubmit = (values: SignInValues) => {
    setGlobalError(null);
    startTransition(() => {
      // Simulate API call
      setTimeout(() => {
        if (values.email === 'error@company.com') {
          setGlobalError(t('auth.signIn.errorDesc'));
        } else {
          // Success
          if (onSuccess) onSuccess();
        }
      }, 1000);
    });
  };

  const hasErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <div className='w-full'>
      {/* Inline Error Banner */}
      {(globalError || hasErrors) && (
        <div
          className='rounded-lg bg-status-danger-subtle border border-error-container p-3.5 mb-6 flex items-start gap-3 shadow-sm'
          role='alert'
        >
          <AlertCircle className='text-error w-5 h-5 shrink-0 mt-0.5 stroke-[2]' />
          <div className='flex-1'>
            <p className='font-label-base text-label-base font-semibold text-error'>
              {t('auth.signIn.error')}
            </p>
            <p className='font-body-sm text-body-sm text-error/90 mt-0.5'>
              {globalError || t('auth.signIn.errorDesc')}
            </p>
          </div>
          <button
            type='button'
            onClick={() => {
              setGlobalError(null);
              form.clearErrors();
            }}
            className='text-error/70 hover:text-error transition-colors outline-none cursor-pointer'
            aria-label='Dismiss alert'
          >
            <X className='w-4 h-4 stroke-[2.5]' />
          </button>
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        {/* Email Field */}
        <div className='space-y-1.5'>
          <label
            htmlFor='email'
            className='block font-label-base text-label-base font-medium text-slate-900 dark:text-white cursor-pointer'
          >
            {t('auth.signIn.email')}
          </label>
          <div className='relative'>
            <input
              id='email'
              type='email'
              {...form.register('email')}
              placeholder={t('auth.signIn.emailPlaceholder')}
              className={cn(
                'w-full h-11 px-4 bg-surface-card dark:bg-slate-900 border rounded-lg font-body-base text-body-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm',
                form.formState.errors.email
                  ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-indigo-600/20'
              )}
            />
            <Mail className='absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none stroke-[2]' />
          </div>
        </div>

        {/* Password Field */}
        <div className='space-y-1.5'>
          <label
            htmlFor='password'
            className='block font-label-base text-label-base font-medium text-slate-900 dark:text-white cursor-pointer'
          >
            {t('auth.signIn.password')}
          </label>
          <div className='relative'>
            <input
              id='password'
              type={showPassword ? 'text' : 'password'}
              {...form.register('password')}
              placeholder={t('auth.signIn.passwordPlaceholder')}
              className={cn(
                'w-full h-11 px-4 pr-11 bg-surface-card dark:bg-slate-900 border rounded-lg font-body-base text-body-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm',
                form.formState.errors.password
                  ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-indigo-600/20'
              )}
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none cursor-pointer'
              aria-label='Toggle password visibility'
            >
              {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className='flex items-center justify-between pt-1'>
          <label className='flex items-center gap-2.5 cursor-pointer select-none group'>
            <Controller
              name='rememberMe'
              control={form.control}
              render={({ field }) => (
                <Checkbox
                  id='rememberMe'
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className='w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 focus-visible:ring-indigo-600/30 transition-colors cursor-pointer'
                />
              )}
            />
            <span className='font-body-sm text-body-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors'>
              {t('auth.signIn.rememberMe')}
            </span>
          </label>
          <a
            href='#'
            onClick={(e) => e.preventDefault()}
            className='font-label-base text-label-base text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/50 rounded-sm'
          >
            {t('auth.signIn.forgotPassword')}
          </a>
        </div>

        {/* Submit Button */}
        <button
          type='submit'
          disabled={isPending}
          className={cn(
            'w-full h-11 mt-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-label-base text-label-base font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-indigo-600/25 cursor-pointer',
            isPending && 'opacity-70 cursor-not-allowed active:scale-100'
          )}
        >
          {isPending ? (
            <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
          ) : (
            <>
              <span>{t('auth.signIn.btn')}</span>
              <ArrowRight className='w-4 h-4 stroke-[2.5]' />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className='relative my-6'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-slate-200 dark:border-slate-800' />
        </div>
        <div className='relative flex justify-center text-xs'>
          <span className='bg-white dark:bg-slate-950 px-3 font-label-sm text-label-sm text-slate-500 font-normal'>
            {t('auth.signIn.orContinue')}
          </span>
        </div>
      </div>

      {/* Google SSO */}
      <div className={isPending ? 'opacity-50 pointer-events-none' : ''}>
        <GoogleSignInButton />
      </div>
    </div>
  );
}
