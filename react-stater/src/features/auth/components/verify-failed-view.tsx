import React, { useState, useEffect, useTransition } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { NexSpaceLogo } from '@/components/brand/logo';
import { ChevronDown, Check, ArrowLeft, XCircle, ShieldAlert, ArrowRight, RotateCw, Mail } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';
import { useLanguage } from '../../landing/context/language-context';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { authService } from '../api/auth-service';
import { toast } from 'sonner';
import { subscribeAuthSync } from '../utils/auth-sync';

export default function VerifyFailedViewPage() {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [emailInput, setEmailInput] = useState('');
  const [isResending, startResend] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeAuthSync((event) => {
      if (event.type === 'EMAIL_VERIFIED_SUCCESS') {
        toast.success('Tài khoản của bạn đã được xác thực thành công!');
        navigate({ to: '/auth/sign-in' });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) {
      toast.error('Vui lòng nhập email');
      return;
    }

    startResend(async () => {
      try {
        await authService.resendVerification(email);
        toast.success(`Đã gửi lại link xác thực mới đến ${email}. Hãy kiểm tra hộp thư!`);
        setResendCooldown(60);
      } catch {
        toast.error('Không thể gửi lại email xác thực. Vui lòng thử lại sau.');
      }
    });
  };

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white dark:bg-slate-950 md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      {/* Left Side: Hero Visual Panel */}
      <motion.div
        initial={{ opacity: 0, filter: 'blur(4px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className='relative hidden h-full flex-col lg:flex overflow-hidden bg-slate-900'
      >
        {/* Background Asset */}
        <img
          src='https://lh3.googleusercontent.com/aida-public/AB6AXuCl4gF0jK0Fes5_FTSU4HUixywxC48EjhF5h9tIDRp3e372ESWNcR1f3ylN2GHs6xEwxcjwl_IYJ4-LPmSkKG4GAhE6If4amR4LlU4H-VyjYEpo32skeg6ZbvOhMY5yJFyS-cGkQebWtMwEhPAg-uDSkSygLkCB5mFSlD39rUScTTChB7BBnMOZiTsU7x3VzvDksxU-6Dq4OlMmlvJwTXuL5trZVjYAMH6JhLDgVh8M1KdF-G7B5ozqGQ'
          alt='Workspace Security'
          className='absolute inset-0 h-full w-full object-cover object-center scale-105 motion-safe:transition-transform motion-safe:duration-1000'
          fetchPriority='high'
          decoding='async'
        />

        {/* Architectural Tone Overlays */}
        <div className='absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]' />
        <div className='absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent' />
        <div className='absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-slate-900/30' />

        <div className='relative z-20 flex h-full flex-col justify-between p-12 xl:p-16 w-full'>
          {/* Top Branding */}
          <div className='flex items-center justify-between'>
            <Link
              to='/'
              className='inline-flex items-center outline-none transition-transform active:scale-95 cursor-pointer'
              aria-label='Return to homepage'
            >
              <NexSpaceLogo variant='horizontal' inverted className='h-10 w-auto' />
            </Link>
            <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-sm'>
              <ShieldAlert className='w-3.5 h-3.5 text-amber-400' />
              <span className='font-caption-code text-caption-code tracking-wider uppercase font-semibold text-white'>
                Token Protection
              </span>
            </div>
          </div>

          {/* Center Architectural Motif */}
          <div className='hidden lg:flex my-auto py-12 flex-col items-start opacity-70 hover:opacity-100 transition-opacity duration-300'>
            <div className='border-l-2 border-amber-400/40 pl-6 space-y-2'>
              <div className='font-caption-code text-caption-code uppercase tracking-widest text-amber-400'>
                Security Check • Invalidation
              </div>
              <div className='font-headline-sm text-headline-sm text-white font-semibold tracking-tight'>
                Automated 24-Hour Expiration Window
              </div>
              <div className='flex items-center gap-3 pt-2 text-slate-300'>
                <span className='font-label-sm text-label-sm text-slate-400'>
                  Verification tokens expire automatically to prevent unauthorized access.
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Quote & Metrics */}
          <div className='space-y-6 mt-auto'>
            <div className='space-y-3 max-w-xl'>
              <div className='font-display-hero text-white/30 leading-none select-none font-serif text-5xl'>
                "
              </div>
              <p className='font-headline-sm text-headline-sm lg:text-headline-md font-semibold text-white tracking-tight -mt-4 leading-snug'>
                Security is our foundational pillar.
              </p>
              <p className='font-body-base text-body-base text-slate-300'>
                Expired or invalid links protect your personal and corporate assets from intrusion.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right Side: Content Section */}
      <motion.div
        initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className='flex h-full w-full flex-col p-6 lg:p-10 relative z-10'
      >
        {/* Static Header Navigation */}
        <header className='flex items-center justify-between w-full'>
          <Link
            to='/auth/sign-in'
            className='inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors outline-none cursor-pointer'
          >
            <ArrowLeft className='h-4 w-4' />
            {language === 'vi' ? 'Quay lại đăng nhập' : 'Back to Sign In'}
          </Link>

          {/* Micro-Utility Capsule */}
          <div className='flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 p-0.5 shadow-sm backdrop-blur-md'>
            <ThemeModeToggle compact />
            <div className='mx-0.5 h-3.5 w-px bg-slate-200 dark:bg-slate-800' />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  aria-label='Chuyển đổi ngôn ngữ / Switch Language'
                  className='flex h-7 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all duration-150 active:scale-95 outline-none'
                >
                  <span className='text-sm leading-none'>{language === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
                  <span className='text-[11px] font-bold uppercase tracking-wider'>{language}</span>
                  <ChevronDown className='h-3 w-3 opacity-60' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44 p-1.5 shadow-lg z-50 rounded-xl'>
                <DropdownMenuItem
                  onClick={() => setLanguage('vi')}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium',
                    language === 'vi'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-base leading-none'>🇻🇳</span>
                    <span>Tiếng Việt (VI)</span>
                  </div>
                  {language === 'vi' && (
                    <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage('en')}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium',
                    language === 'en'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-base leading-none'>🇺🇸</span>
                    <span>English (EN)</span>
                  </div>
                  {language === 'en' && (
                    <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Center Card Content */}
        <main className='flex flex-1 flex-col items-center justify-center py-10'>
          <div className='w-full max-w-[440px] text-center space-y-6'>
            {/* Error Icon */}
            <div className='relative mx-auto w-20 h-20'>
              <div className='relative w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-lg'>
                <XCircle className='w-10 h-10 stroke-[2.5]' />
              </div>
            </div>

            <div className='space-y-2'>
              <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white'>
                {language === 'vi' ? 'Liên kết không hợp lệ' : 'Invalid or Expired Link'}
              </h1>
              <p className='text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto'>
                {language === 'vi'
                  ? 'Liên kết xác thực tài khoản này đã hết hạn hoặc đã được sử dụng trước đó. Vui lòng yêu cầu gửi lại liên kết mới bên dưới.'
                  : 'This activation link has expired or has already been used. Please request a new link below.'}
              </p>
            </div>

            {/* Resend Form */}
            <form onSubmit={handleResend} className='pt-2 space-y-3.5 text-left'>
              <div>
                <label className='block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5'>
                  {language === 'vi' ? 'Địa chỉ email tài khoản của bạn:' : 'Your account email:'}
                </label>
                <div className='relative'>
                  <Mail className='w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2' />
                  <input
                    type='email'
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder='you@example.com'
                    required
                    className='w-full h-11 pl-10 pr-4 bg-surface-card dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600'
                  />
                </div>
              </div>

              <button
                type='submit'
                disabled={resendCooldown > 0 || isResending}
                className={cn(
                  'w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all outline-none focus:ring-4 focus:ring-indigo-600/25 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
                  isResending && 'cursor-wait'
                )}
              >
                {isResending ? (
                  <RotateCw className='w-4 h-4 animate-spin' />
                ) : (
                  <ArrowRight className='w-4 h-4 stroke-[2.5]' />
                )}
                <span>
                  {resendCooldown > 0
                    ? `Gửi lại sau (${resendCooldown}s)`
                    : language === 'vi'
                      ? 'Gửi lại link xác thực mới'
                      : 'Resend Verification Link'}
                </span>
              </button>

              <Link
                to='/auth/sign-up'
                className='w-full h-10 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium rounded-lg flex items-center justify-center transition-all'
              >
                <span>{language === 'vi' ? 'Quay về trang Đăng ký' : 'Back to Sign Up'}</span>
              </Link>
            </form>
          </div>
        </main>
      </motion.div>
    </div>
  );
}
