import React, { useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Building2
} from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from '@tanstack/react-router';

// Schemas
const requestSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

const verifySchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits')
});

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

type Step = 'request' | 'verify' | 'reset' | 'success';

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

function PasswordStrengthMeter({ password, t }: { password?: string; t: (k: string) => string }) {
  const score = getPasswordStrength(password || '');

  if (!password) return null;

  return (
    <div className='mt-2 flex flex-col gap-1.5'>
      <div className='flex gap-1'>
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
              idx <= score ? getColor(score) : 'bg-slate-200 dark:bg-slate-800'
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

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('request');
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State to hold email across steps
  const [email, setEmail] = useState('');

  // Forms
  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' }
  });

  const verifyForm = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' }
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Handlers
  const onRequestSubmit = (values: z.infer<typeof requestSchema>) => {
    startTransition(() => {
      setTimeout(() => {
        setEmail(values.email);
        setStep('verify');
      }, 1000);
    });
  };

  const onVerifySubmit = (_values: z.infer<typeof verifySchema>) => {
    startTransition(() => {
      setTimeout(() => {
        setStep('reset');
      }, 1000);
    });
  };

  const onResetSubmit = (_values: z.infer<typeof resetSchema>) => {
    startTransition(() => {
      setTimeout(() => {
        setStep('success');
      }, 1000);
    });
  };

  // Password value for strength meter
  const pwd = useWatch({
    control: resetForm.control,
    name: 'password',
    defaultValue: ''
  });

  const renderRequestStep = () => (
    <motion.div
      key='request'
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className='w-full mx-auto max-w-[420px] space-y-6'
    >
      <div className='flex flex-col space-y-2 text-left'>
        <div className='inline-flex lg:hidden items-center gap-2.5 mb-2'>
          <div className='w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md'>
            <Building2 className='w-4 h-4' />
          </div>
          <span className='font-headline-sm text-headline-sm font-bold tracking-tight text-slate-900 dark:text-white'>
            NexSpace
          </span>
        </div>
        <h1 className='font-display-hero text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>
          {t('auth.resetPassword.title')}
        </h1>
        <p className='text-slate-600 dark:text-slate-300 font-body-base text-body-base mt-1.5 leading-relaxed'>
          {t('auth.resetPassword.subtitle')}
        </p>
      </div>

      <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className='space-y-4'>
        <div className='space-y-1.5'>
          <label
            htmlFor='email'
            className='block font-label-base text-label-base font-medium text-slate-900 dark:text-white'
          >
            {t('auth.resetPassword.email')}
          </label>
          <div className='relative'>
            <input
              id='email'
              type='email'
              {...requestForm.register('email')}
              placeholder={t('auth.resetPassword.emailPlaceholder')}
              className={cn(
                'w-full h-11 px-4 bg-surface-card dark:bg-slate-900 border rounded-lg font-body-base text-body-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm',
                requestForm.formState.errors.email
                  ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-indigo-600/20'
              )}
            />
            <Mail className='absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none stroke-[2]' />
          </div>
          {requestForm.formState.errors.email && (
            <p className='text-status-danger text-sm mt-1.5 font-medium'>
              {requestForm.formState.errors.email.message}
            </p>
          )}
        </div>

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
              <span>{t('auth.resetPassword.requestBtn')}</span>
              <ArrowRight className='w-4 h-4 stroke-[2.5]' />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );

  const renderVerifyStep = () => (
    <motion.div
      key='verify'
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className='w-full mx-auto max-w-[420px] space-y-6'
    >
      <div className='flex flex-col space-y-2 text-center items-center'>
        <div className='w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-2'>
          <ShieldCheck className='w-6 h-6 text-indigo-600 dark:text-indigo-400' />
        </div>
        <h1 className='font-display-hero text-2xl font-bold tracking-tight text-slate-900 dark:text-white'>
          {t('auth.resetPassword.verifyTitle')}
        </h1>
        <p className='text-slate-600 dark:text-slate-300 font-body-base text-body-base mt-1.5 leading-relaxed'>
          {t('auth.resetPassword.verifySubtitle')}{' '}
          <span className='font-medium text-slate-900 dark:text-white'>{email}</span>
        </p>
      </div>

      <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className='space-y-4'>
        <div className='space-y-1.5'>
          <div className='relative'>
            <input
              type='text'
              inputMode='numeric'
              maxLength={6}
              {...verifyForm.register('code')}
              placeholder='000000'
              className={cn(
                'w-full h-14 text-center tracking-[1em] text-2xl font-bold bg-surface-card dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-300 focus:outline-none focus:ring-4 transition-all shadow-sm',
                verifyForm.formState.errors.code
                  ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-indigo-600/20'
              )}
            />
          </div>
          {verifyForm.formState.errors.code && (
            <p className='text-status-danger text-sm mt-1.5 font-medium text-center'>
              {verifyForm.formState.errors.code.message}
            </p>
          )}
        </div>

        <button
          type='submit'
          disabled={isPending}
          className={cn(
            'w-full h-11 mt-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-label-base text-label-base font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-indigo-600/25 cursor-pointer',
            isPending && 'opacity-70 cursor-not-allowed active:scale-100'
          )}
        >
          {isPending ? (
            <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
          ) : (
            <>
              <span>{t('auth.resetPassword.verifyBtn')}</span>
              <ArrowRight className='w-4 h-4 stroke-[2.5]' />
            </>
          )}
        </button>

        <p className='text-center text-sm text-slate-600 dark:text-slate-400 mt-6'>
          {t('auth.resetPassword.resendText')}{' '}
          <button
            type='button'
            className='text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer'
          >
            {t('auth.resetPassword.resendLink')}
          </button>
        </p>
      </form>
    </motion.div>
  );

  const renderResetStep = () => (
    <motion.div
      key='reset'
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className='w-full mx-auto max-w-[420px] space-y-6'
    >
      <div className='flex flex-col space-y-2 text-left'>
        <div className='w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-2'>
          <KeyRound className='w-6 h-6 text-indigo-600 dark:text-indigo-400' />
        </div>
        <h1 className='font-display-hero text-2xl font-bold tracking-tight text-slate-900 dark:text-white'>
          {t('auth.resetPassword.newPasswordTitle')}
        </h1>
        <p className='text-slate-600 dark:text-slate-300 font-body-base text-body-base mt-1.5 leading-relaxed'>
          {t('auth.resetPassword.newPasswordSubtitle')}
        </p>
      </div>

      <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className='space-y-4'>
        <div className='space-y-1.5'>
          <label
            htmlFor='password'
            className='block font-label-base text-label-base font-medium text-slate-900 dark:text-white'
          >
            {t('auth.resetPassword.password')}
          </label>
          <div className='relative'>
            <input
              id='password'
              type={showPassword ? 'text' : 'password'}
              {...resetForm.register('password')}
              placeholder={t('auth.resetPassword.passwordPlaceholder')}
              className={cn(
                'w-full h-11 px-4 pr-11 bg-surface-card dark:bg-slate-900 border rounded-lg font-body-base text-body-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm',
                resetForm.formState.errors.password
                  ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-indigo-600/20'
              )}
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer'
            >
              {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
            </button>
          </div>
          {/* Password Strength Indicator */}
          <PasswordStrengthMeter password={pwd} t={t} />
          {resetForm.formState.errors.password && (
            <p className='text-status-danger text-sm mt-1.5 font-medium'>
              {resetForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <label
            htmlFor='confirmPassword'
            className='block font-label-base text-label-base font-medium text-slate-900 dark:text-white'
          >
            {t('auth.resetPassword.confirmPassword')}
          </label>
          <div className='relative'>
            <input
              id='confirmPassword'
              type={showConfirmPassword ? 'text' : 'password'}
              {...resetForm.register('confirmPassword')}
              placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
              className={cn(
                'w-full h-11 px-4 pr-11 bg-surface-card dark:bg-slate-900 border rounded-lg font-body-base text-body-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm',
                resetForm.formState.errors.confirmPassword
                  ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-indigo-600/20'
              )}
            />
            <button
              type='button'
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer'
            >
              {showConfirmPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
            </button>
          </div>
          {resetForm.formState.errors.confirmPassword && (
            <p className='text-status-danger text-sm mt-1.5 font-medium'>
              {resetForm.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type='submit'
          disabled={isPending || getPasswordStrength(pwd) < 2}
          className={cn(
            'w-full h-11 mt-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-label-base text-label-base font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all focus:outline-none focus:ring-4 focus:ring-indigo-600/25 cursor-pointer',
            (isPending || getPasswordStrength(pwd) < 2) &&
              'opacity-70 cursor-not-allowed active:scale-100'
          )}
        >
          {isPending ? (
            <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
          ) : (
            <>
              <span>{t('auth.resetPassword.updateBtn')}</span>
              <CheckCircle2 className='w-4 h-4 stroke-[2.5]' />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );

  const renderSuccessStep = () => (
    <motion.div
      key='success'
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className='w-full mx-auto max-w-[420px] space-y-6 text-center'
    >
      <div className='w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4'>
        <CheckCircle2 className='w-8 h-8 text-emerald-600 dark:text-emerald-400' />
      </div>
      <h1 className='font-display-hero text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>
        {t('auth.resetPassword.successTitle')}
      </h1>
      <p className='text-slate-600 dark:text-slate-300 font-body-base text-body-base mt-1.5 leading-relaxed'>
        {t('auth.resetPassword.successSubtitle')}
      </p>

      <Link
        to='/auth/sign-in'
        className='w-full h-11 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-indigo-600/25 outline-none'
      >
        {t('auth.resetPassword.successBtn')}
      </Link>
    </motion.div>
  );

  return (
    <div className='w-full'>
      <AnimatePresence mode='wait'>
        {step === 'request' && renderRequestStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'reset' && renderResetStep()}
        {step === 'success' && renderSuccessStep()}
      </AnimatePresence>
    </div>
  );
}
