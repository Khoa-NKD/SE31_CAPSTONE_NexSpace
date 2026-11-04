import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link, useSearch } from '@tanstack/react-router';
import { InteractiveGridPattern } from './interactive-grid';
import SignUpForm from './sign-up-form';
import { NexSpaceLogo } from '@/components/brand/logo';
import { ChevronDown, Check, ArrowLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';
import { useLanguage } from '../../landing/context/language-context';
import { EmailVerificationModal } from './email-verification-modal';
import { motion } from 'motion/react';
import { broadcastAuthSync, subscribeAuthSync } from '../utils/auth-sync';
import { toast } from 'sonner';

function SignUpContent() {
  const { language, setLanguage, t } = useLanguage();
  const search = useSearch({ strict: false }) as { verified?: boolean | string; email?: string } | undefined;

  const verifiedParam = search?.verified ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('verified') : undefined);
  const isVerifiedFromUrl = verifiedParam === true || verifiedParam === 'true';
  const emailParam = search?.email ?? (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('email') : undefined);

  const [manualEmail, setManualEmail] = useState<string | null>(null);
  const [isModalDismissed, setIsModalDismissed] = useState(false);

  // Derive verification email without setState in effect
  const verificationEmail = isModalDismissed
    ? null
    : isVerifiedFromUrl
      ? (emailParam || (typeof window !== 'undefined' ? localStorage.getItem('nexspace_pending_verification_email') : null) || 'tài khoản của bạn')
      : manualEmail;

  useEffect(() => {
    if (verifiedParam === false || verifiedParam === 'false') {
      toast.error('Liên kết xác thực email không hợp lệ hoặc đã hết hạn.');
    }
  }, [verifiedParam]);

  useEffect(() => {
    if (!isVerifiedFromUrl) return;

    // 1. Notify the original sign up tab
    broadcastAuthSync({ type: 'EMAIL_VERIFIED_SUCCESS' });

    // 2. Inquire if another sign-up tab is already active
    broadcastAuthSync({ type: 'CHECK_EXISTING_SIGNUP_TAB' });

    // 3. If another tab is active, attempt to close this tab so user stays on original tab
    const unsubscribe = subscribeAuthSync((event) => {
      if (event.type === 'SIGNUP_TAB_ALREADY_ACTIVE') {
        try {
          window.open('', '_self', '');
          window.close();
        } catch {
          // Ignored if browser blocks window.close
        }
      }
    });

    return () => unsubscribe();
  }, [isVerifiedFromUrl]);

  const handleSuccess = (email: string) => {
    setManualEmail(email);
    setIsModalDismissed(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexspace_pending_verification_email', email);
    }
  };

  const closeVerificationModal = () => {
    setManualEmail(null);
    setIsModalDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexspace_pending_verification_email');
    }
  };

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <EmailVerificationModal
        isOpen={!!verificationEmail}
        onClose={closeVerificationModal}
        email={verificationEmail || ''}
        initialVerified={isVerifiedFromUrl}
      />
      {/* Left Side: Form Section */}
      <motion.div
        initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className='flex h-full w-full flex-col p-6 lg:p-10 relative z-10'
      >
        {/* Static Header Navigation */}
        <header className='flex items-center justify-between w-full'>
          <Link
            to='/'
            className='inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground outline-none cursor-pointer'
          >
            <ArrowLeft className='h-4 w-4' />
            {t('auth.backToHome')}
          </Link>

          {/* Micro-Utility Capsule */}
          <div className='flex items-center rounded-full border border-border/80 bg-background/80 p-0.5 shadow-sm backdrop-blur-md'>
            <ThemeModeToggle compact />
            <div className='mx-0.5 h-3.5 w-px bg-border/70' />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  aria-label='Chuyển đổi ngôn ngữ / Switch Language'
                  className='flex h-7 cursor-pointer items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95 outline-none'
                >
                  <span className='text-sm leading-none'>{language === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
                  <span className='text-[11px] font-bold uppercase tracking-wider'>{language}</span>
                  <ChevronDown className='h-3 w-3 opacity-60' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-36'>
                <DropdownMenuItem
                  onClick={() => setLanguage('vi')}
                  className={cn(
                    'flex items-center justify-between text-xs cursor-pointer',
                    language === 'vi' && 'font-bold text-primary'
                  )}
                >
                  <span className='flex items-center gap-2'>🇻🇳 Tiếng Việt</span>
                  {language === 'vi' && <Check className='h-3.5 w-3.5' />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage('en')}
                  className={cn(
                    'flex items-center justify-between text-xs cursor-pointer',
                    language === 'en' && 'font-bold text-primary'
                  )}
                >
                  <span className='flex items-center gap-2'>🇺🇸 English</span>
                  {language === 'en' && <Check className='h-3.5 w-3.5' />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Center Area: Form */}
        <div className='flex flex-1 items-center justify-center py-6'>
          <div className='mx-auto flex w-full flex-col justify-center space-y-6 max-w-[420px]'>
            {/* Form Component Container */}
            <SignUpForm onSuccess={handleSuccess} />

            <p className='text-center text-xs text-muted-foreground'>
              {t('auth.signUp.termsPrompt')}{' '}
              <Link
                to='/terms-of-service'
                className='font-medium text-foreground underline-offset-4 hover:underline cursor-pointer'
              >
                {t('auth.signUp.termsLink')}
              </Link>{' '}
              {t('auth.signUp.and')}{' '}
              <Link
                to='/privacy-policy'
                className='font-medium text-foreground underline-offset-4 hover:underline cursor-pointer'
              >
                {t('auth.signUp.privacyLink')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer info: NexSpace Minimal */}
        <footer className='text-xs text-muted-foreground flex justify-between items-center w-full'>
          <span>{t('auth.copyright')}</span>
          <span className='font-mono text-[11px] text-muted-foreground/60'>
            {t('auth.enterpriseAuth')}
          </span>
        </footer>
      </motion.div>

      {/* Right Side: Architectural Visual Motif & Brand Value */}
      <motion.div
        initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className='relative hidden h-full flex-col bg-slate-900 p-10 text-white lg:flex dark:border-l dark:border-border/40 overflow-hidden'
      >
        <div className='absolute inset-0 bg-slate-950/60 z-10 backdrop-blur-[0.5px]' />
        <img
          src='https://lh3.googleusercontent.com/aida-public/AB6AXuCl4gF0jK0Fes5_FTSU4HUixywxC48EjhF5h9tIDRp3e372ESWNcR1f3ylN2GHs6xEwxcjwl_IYJ4-LPmSkKG4GAhE6If4amR4LlU4H-VyjYEpo32skeg6ZbvOhMY5yJFyS-cGkQebWtMwEhPAg-uDSkSygLkCB5mFSlD39rUScTTChB7BBnMOZiTsU7x3VzvDksxU-6Dq4OlMmlvJwTXuL5trZVjYAMH6JhLDgVh8M1KdF-G7B5ozqGQ'
          alt='Premium Workspace Coworking Space'
          className='absolute inset-0 h-full w-full object-cover object-center filter saturate-110 motion-safe:transition-transform motion-safe:duration-1000 hover:scale-105'
          fetchPriority='high'
          decoding='async'
        />
        <InteractiveGridPattern
          className='absolute inset-0 opacity-15 mix-blend-overlay z-10'
          width={36}
          height={36}
        />

        {/* Subtle dynamic glow */}
        <div className='absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none z-10' />

        {/* Content Layer */}
        <div className='relative z-20 flex items-center gap-2'>
          <NexSpaceLogo variant='horizontal' inverted className='h-8 w-auto' />
        </div>

        <div className='relative z-20 mt-auto max-w-lg'>
          <div className='space-y-4'>
            <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white/90 font-medium'>
              <span className='w-2 h-2 rounded-full bg-emerald-400 animate-pulse' />
              {t('auth.signUp.liveWorkspacesBadge')}
            </div>
            <blockquote className='space-y-2'>
              <p className='text-xl font-medium tracking-tight leading-snug font-serif text-slate-100'>
                {t('auth.signUp.quote')}
              </p>
              <footer className='text-sm text-slate-300 font-sans pt-2 flex items-center gap-2'>
                <span className='font-semibold text-white'>Nguyen Hoang Nam</span>
                <span className='text-slate-500'>—</span>
                <span className='text-xs text-slate-300'>{t('auth.signUp.authorRole')}</span>
              </footer>
            </blockquote>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function SignUpViewPage() {
  return <SignUpContent />;
}

export default SignUpViewPage;
