import React, { useState, useEffect, useTransition } from 'react';
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
  Building2,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from '@tanstack/react-router';
import { authService } from '../api/auth-service';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { broadcastAuthSync, subscribeAuthSync } from '../utils/auth-sync';

// Schemas
const requestSchema = z.object({
  email: z.string().email('Vui lòng nhập địa chỉ email hợp lệ')
});

const verifySchema = z.object({
  token: z.string().min(1, 'Vui lòng nhập hoặc dán mã Token từ email')
});

const resetSchema = z
  .object({
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
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
  const location = useLocation();
  const [step, setStep] = useState<Step>('request');
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State to hold email and token across steps
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Forms
  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' }
  });

  const verifyForm = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    defaultValues: { token: '' }
  });

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Automatically detect token from URL (e.g. /auth/reset-password?token=... or /reset-password?token=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setResetToken(urlToken);
        verifyForm.setValue('token', urlToken);
        // Broadcast to other tabs (e.g. Tab A waiting on Step 2 in Photo 2)
        broadcastAuthSync({ type: 'RESET_TOKEN_CLICKED', token: urlToken });

        // Automatically validate the token
        startTransition(async () => {
          try {
            const res = await authService.verifyResetToken(urlToken);
            if (res.valid) {
              if (res.contactInfo) setEmail(res.contactInfo);
              setStep('reset');
              toast.success('Mã token hợp lệ. Vui lòng tạo mật khẩu mới.');
            } else {
              setErrorMessage(res.message || 'Mã token không hợp lệ hoặc đã hết hạn.');
              setStep('verify');
            }
          } catch {
            setErrorMessage('Không thể xác minh token. Vui lòng kiểm tra lại.');
            setStep('verify');
          }
        });
      }
    }
  }, [location.search, verifyForm]);

  // Real-time synchronization across tabs and devices
  useEffect(() => {
    const unsubscribe = subscribeAuthSync((event) => {
      if (event.type === 'RESET_TOKEN_CLICKED' && event.token) {
        const token = event.token.trim();
        setResetToken(token);
        verifyForm.setValue('token', token);
        startTransition(async () => {
          try {
            const res = await authService.verifyResetToken(token);
            if (res.valid) {
              if (res.contactInfo) setEmail(res.contactInfo);
              setStep('reset');
              toast.success('Đã tự động đồng bộ liên kết từ email. Hãy tạo mật khẩu mới.');
            }
          } catch {
            // Silently ignore sync verify errors
          }
        });
      } else if (event.type === 'RESET_PASSWORD_COMPLETED') {
        setStep('success');
        toast.success('Mật khẩu của bạn đã được đặt lại thành công!');
      } else if (event.type === 'EMAIL_VERIFIED_SUCCESS') {
        setStep('success');
        toast.success('Xác thực tài khoản thành công!');
      }
    });

    return () => unsubscribe();
  }, [verifyForm]);

  // Handlers
  const onRequestSubmit = (values: z.infer<typeof requestSchema>) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await authService.initiateForgotPassword(values.email.trim());
        setEmail(values.email.trim());
        setStep('verify');
        toast.success('Đã gửi email hướng dẫn đặt lại mật khẩu!');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          const msg = payload?.message || err.message || 'Không thể gửi yêu cầu.';
          setErrorMessage(msg);
          toast.error(msg);
        } else {
          const msg = 'Không thể gửi yêu cầu. Vui lòng thử lại sau.';
          setErrorMessage(msg);
          toast.error(msg);
        }
      }
    });
  };

  const onVerifySubmit = (values: z.infer<typeof verifySchema>) => {
    setErrorMessage(null);
    const token = values.token.trim();
    startTransition(async () => {
      try {
        const res = await authService.verifyResetToken(token);
        if (res.valid) {
          setResetToken(token);
          if (res.contactInfo) setEmail(res.contactInfo);
          setStep('reset');
          toast.success('Mã token hợp lệ! Hãy nhập mật khẩu mới.');
        } else {
          setErrorMessage(res.message || 'Mã token không hợp lệ hoặc đã hết hạn.');
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          setErrorMessage(payload?.message || err.message || 'Mã token không hợp lệ');
        } else {
          setErrorMessage('Không thể kết nối đến máy chủ.');
        }
      }
    });
  };

  const onResetSubmit = (values: z.infer<typeof resetSchema>) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        await authService.completeForgotPassword({
          resetToken: resetToken.trim(),
          newPassword: values.password,
          confirmNewPassword: values.confirmPassword
        });
        toast.success('Đặt lại mật khẩu thành công!');
        broadcastAuthSync({ type: 'RESET_PASSWORD_COMPLETED' });
        setStep('success');
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          const msg = payload?.message || err.message || 'Đặt lại mật khẩu thất bại.';
          setErrorMessage(msg);
          toast.error(msg);
        } else {
          const msg = 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau.';
          setErrorMessage(msg);
          toast.error(msg);
        }
      }
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
      <div className='flex flex-col space-y-2 text-center items-center'>
        <div className='w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mb-2'>
          <KeyRound className='w-6 h-6 text-indigo-600 dark:text-indigo-400' />
        </div>
        <h1 className='font-display-hero text-2xl font-bold tracking-tight text-slate-900 dark:text-white'>
          {t('auth.resetPassword.title')}
        </h1>
        <p className='text-slate-600 dark:text-slate-300 font-body-base text-body-base mt-1.5 leading-relaxed'>
          {t('auth.resetPassword.subtitle')}
        </p>
      </div>

      {errorMessage && (
        <div className='rounded-lg bg-status-danger-subtle border border-error-container p-3 flex items-start gap-2.5 text-error text-xs'>
          <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className='space-y-4'>
        <div className='space-y-1.5'>
          <label className='block text-xs font-medium text-slate-700 dark:text-slate-300'>
            {t('auth.resetPassword.emailLabel')}
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
          Kiểm tra email của bạn
        </h1>
        <p className='text-slate-600 dark:text-slate-300 font-body-base text-body-base mt-1.5 leading-relaxed'>
          Chúng tôi đã gửi link đặt lại mật khẩu đến{' '}
          <span className='font-medium text-slate-900 dark:text-white'>{email}</span>.
        </p>
      </div>

      <div className='p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed text-left flex items-start gap-2.5'>
        <div className='w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse mt-0.5 shrink-0' />
        <div>
          <strong>Tự động đồng bộ:</strong> Khi bạn bấm nút <em>"Đặt lại mật khẩu"</em> trong email, trang này sẽ tự động chuyển bước tiếp theo mà bạn <strong>không cần phải nhập token</strong>.
        </div>
      </div>

      <div className='p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left'>
        💡 Nếu mở email trên thiết bị khác, bạn cũng có thể sao chép mã <strong>Token</strong> được gửi kèm và dán vào ô bên dưới:
      </div>

      {errorMessage && (
        <div className='rounded-lg bg-status-danger-subtle border border-error-container p-3 flex items-start gap-2.5 text-error text-xs'>
          <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className='space-y-4'>
        <div className='space-y-1.5'>
          <label className='block text-xs font-medium text-slate-700 dark:text-slate-300'>
            Mã Token đặt lại mật khẩu:
          </label>
          <input
            type='text'
            {...verifyForm.register('token')}
            placeholder='Dán mã token vào đây...'
            className={cn(
              'w-full h-12 px-3 text-sm bg-surface-card dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm',
              verifyForm.formState.errors.token
                ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
                : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-indigo-600/20'
            )}
          />
          {verifyForm.formState.errors.token && (
            <p className='text-status-danger text-sm mt-1.5 font-medium'>
              {verifyForm.formState.errors.token.message}
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
              <span>Xác nhận Token</span>
              <ArrowRight className='w-4 h-4 stroke-[2.5]' />
            </>
          )}
        </button>

        <p className='text-center text-sm text-slate-600 dark:text-slate-400 mt-4'>
          Chưa nhận được email?{' '}
          <button
            type='button'
            onClick={() => setStep('request')}
            className='text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer'
          >
            Gửi lại yêu cầu
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
      <div className='flex flex-col space-y-2 text-center items-center'>
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

      {errorMessage && (
        <div className='rounded-lg bg-status-danger-subtle border border-error-container p-3 flex items-start gap-2.5 text-error text-xs'>
          <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className='space-y-4'>
        <div className='space-y-1.5'>
          <label className='block text-xs font-medium text-slate-700 dark:text-slate-300'>
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
          <PasswordStrengthMeter password={pwd} t={t} />
          {resetForm.formState.errors.password && (
            <p className='text-status-danger text-sm mt-1.5 font-medium'>
              {resetForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className='space-y-1.5'>
          <label className='block text-xs font-medium text-slate-700 dark:text-slate-300'>
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
        className='w-full h-11 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md transition-all focus:outline-none focus:ring-4 focus:ring-indigo-600/25 outline-none'
      >
        <span>Đăng nhập lại ngay</span>
        <ArrowRight className='w-4 h-4 stroke-[2.5]' />
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

export default ResetPasswordForm;
