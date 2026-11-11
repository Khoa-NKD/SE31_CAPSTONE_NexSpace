import React, { useRef, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowRight, Eye, EyeOff, AlertCircle, X, MailCheck } from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import GoogleSignInButton from './google-auth-button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Link, useRouter } from '@tanstack/react-router';
import { authService } from '../api/auth-service';
import { useAuthStore } from '../store/auth-store';
import { getUserRole, checkRouteAccess } from '../utils/role-guard';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

// Schema validation
const signInSchema = z.object({
  email: z.string().min(1, 'Email hoặc tên đăng nhập là bắt buộc'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
  rememberMe: z.boolean()
});

type SignInValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
  onSuccess?: () => void;
}

export function SignInForm({ onSuccess }: SignInFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const submitting = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  const needsEmailVerification = Boolean(
    globalError &&
      (globalError.toLowerCase().includes('xác thực email') ||
        globalError.toUpperCase().includes('INACTIVE'))
  );

  const handleResendVerification = async () => {
    const contactInfo = form.getValues('email')?.trim();
    if (!contactInfo || resendingVerification) return;
    setResendingVerification(true);
    try {
      await authService.resendVerification(contactInfo);
      toast.success('Đã gửi lại email xác thực', {
        description: 'Nếu tài khoản hợp lệ, liên kết xác thực đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.'
      });
    } catch {
      toast.error('Không thể gửi lại email xác thực. Vui lòng thử lại sau.');
    } finally {
      setResendingVerification(false);
    }
  };

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  const verifiedHandled = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined' || verifiedHandled.current) return;
    verifiedHandled.current = true;

    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const emailParam = params.get('email');

    if (emailParam) {
      form.setValue('email', emailParam);
    }

    if (verified === 'true') {
      toast.success('Xác thực tài khoản thành công! Vui lòng đăng nhập.');
    } else if (verified === 'false') {
      toast.error('Liên kết xác thực email không hợp lệ hoặc đã hết hạn.');
    }
  }, [form]);

  const onSubmit = async (values: SignInValues) => {
    if (submitting.current) return;
    submitting.current = true;
    setIsPending(true);
    setGlobalError(null);
    try {
      const response = await authService.login({
        username: values.email.trim(),
        password: values.password
      });

      // Save session in auth store
      useAuthStore.getState().setAuth({
        user: response.user,
        accessToken: response.accessToken
      });

      toast.success(
        `Đăng nhập thành công! Chào mừng ${response.user.fullName || response.user.firstName || response.user.userName}`
      );

      if (onSuccess) {
        onSuccess();
      } else {
        // Preserve role-aware navigation and authorized return destinations.
        const role = getUserRole(response.user);
        let targetUrl = '';

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const redirectParam = params.get('redirect');
          if (redirectParam && checkRouteAccess(redirectParam, true, response.user).allowed) {
            targetUrl = redirectParam;
          }
        }

        if (!targetUrl) {
          if (role === 'ADMIN') {
            targetUrl = '/dashboard/overview';
          } else if (role === 'ORGANIZER') {
            targetUrl = '/dashboard/organizer/workspaces';
          } else {
            targetUrl = '/';
          }
        }

        router.navigate({ to: targetUrl });
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const payload = err.data as { message?: string; errors?: Record<string, string> } | null;
        const msg =
          payload?.message || err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác';
        setGlobalError(msg);
        toast.error(msg);
      } else {
        const msg = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
        setGlobalError(msg);
        toast.error(msg);
      }
    } finally {
      submitting.current = false;
      setIsPending(false);
    }
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
            {needsEmailVerification && (
              <button
                type='button'
                disabled={resendingVerification}
                onClick={() => void handleResendVerification()}
                className='mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer disabled:opacity-60'
              >
                <MailCheck className='w-3.5 h-3.5' />
                <span>
                  {resendingVerification ? 'Đang gửi email xác thực...' : 'Gửi lại email xác thực'}
                </span>
              </button>
            )}
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

      {/* Main Form */}
      <form
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event);
        }}
        className='space-y-4'
      >
        {/* Email or Username Input */}
        <div className='space-y-1.5'>
          <label
            htmlFor='email'
            className='font-label-base text-label-base text-slate-700 dark:text-slate-300 font-medium'
          >
            {t('auth.signIn.email')}
          </label>
          <div className='relative'>
            <input
              id='email'
              type='text'
              autoComplete='username'
              {...form.register('email')}
              placeholder='Nhập email hoặc tên đăng nhập...'
              className={cn(
                'w-full h-11 px-4 bg-surface-card dark:bg-slate-900 border rounded-lg font-body-base text-body-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all shadow-sm',
                form.formState.errors.email
                  ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/15'
                  : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-indigo-600/20'
              )}
            />
          </div>
          {form.formState.errors.email && (
            <p className='text-status-danger text-sm mt-1.5 font-medium'>
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div className='space-y-1.5'>
          <div className='flex items-center justify-between'>
            <label
              htmlFor='password'
              className='font-label-base text-label-base text-slate-700 dark:text-slate-300 font-medium'
            >
              {t('auth.signIn.password')}
            </label>
            <Link
              to='/auth/reset-password'
              className='font-label-base text-label-base text-indigo-600 dark:text-indigo-400 font-semibold hover:underline outline-none cursor-pointer'
            >
              {t('auth.signIn.forgotPassword')}
            </Link>
          </div>
          <div className='relative'>
            <input
              id='password'
              type={showPassword ? 'text' : 'password'}
              autoComplete='current-password'
              {...form.register('password')}
              placeholder='••••••••'
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
              className='absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none cursor-pointer'
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className='text-status-danger text-sm mt-1.5 font-medium'>
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        <div className='flex items-center space-x-2 pt-1'>
          <Controller
            control={form.control}
            name='rememberMe'
            render={({ field }) => (
              <Checkbox
                id='rememberMe'
                checked={field.value}
                onCheckedChange={field.onChange}
                className='data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600'
              />
            )}
          />
          <label
            htmlFor='rememberMe'
            className='font-body-base text-body-base text-slate-600 dark:text-slate-400 select-none cursor-pointer'
          >
            {t('auth.signIn.rememberMe')}
          </label>
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

      {/* Social Divider */}
      <div className='relative my-6'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-slate-200 dark:border-slate-800' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-white dark:bg-slate-950 px-3 text-slate-500 dark:text-slate-400 font-medium'>
            {t('auth.signIn.orContinue')}
          </span>
        </div>
      </div>

      {/* Google Sign In */}
      <GoogleSignInButton />
    </div>
  );
}

export default SignInForm;
