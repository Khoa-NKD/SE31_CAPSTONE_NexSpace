import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from '@tanstack/react-router';
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

function SignUpContent() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  const handleSuccess = (email: string) => {
    setVerificationEmail(email);
  };

  const closeVerificationModal = () => {
    setVerificationEmail(null);
  };

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <EmailVerificationModal 
        isOpen={!!verificationEmail} 
        onClose={closeVerificationModal} 
        email={verificationEmail || ''} 
      />
      {/* Left Side: Form Section */}
      <div className='flex h-full w-full flex-col p-6 lg:p-10 relative z-10'>
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
              <DropdownMenuContent align='end' className='w-44 p-1.5 shadow-lg z-50 rounded-xl'>
                <DropdownMenuItem
                  onClick={() => setLanguage('vi')}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium ${
                    language === 'vi'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-foreground hover:bg-muted'
                  }`}
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
                  className={`flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium ${
                    language === 'en'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-foreground hover:bg-muted'
                  }`}
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

        {/* Form Container perfectly centered vertically using flex-1 */}
        <main className='flex flex-1 flex-col items-center justify-center py-10'>
          <div className='mx-auto flex w-full max-w-[420px] flex-col justify-center space-y-6'>
            <div className='flex flex-col space-y-2 text-left'>
              <h1 className='font-display-hero text-3xl font-bold tracking-tight text-foreground'>
                {t('auth.signUp.title')}
              </h1>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                {t('auth.signUp.subtitle')}
              </p>
            </div>

            <SignUpForm onSuccess={handleSuccess} />

            <p className='text-center text-sm text-muted-foreground mt-4'>
              {t('auth.signUp.alreadyHaveAccount')}{' '}
              <Link
                to='/auth/sign-in'
                className='text-indigo-600 font-semibold hover:underline underline-offset-4 cursor-pointer transition-colors'
              >
                {t('auth.signUp.signIn')}
              </Link>
            </p>
          </div>
        </main>
      </div>

      {/* Right Side: Branding & Visuals (Hidden on small screens) */}
      <div className='relative hidden h-full flex-col lg:flex overflow-hidden'>
        {/* Background Image */}
        <img
          src='/images/register-bg.jpg'
          alt='Premium Workspace'
          className='absolute inset-0 h-full w-full object-cover object-center'
          fetchPriority='high'
          decoding='async'
        />

        {/* Overlays for depth and readability */}
        <div className='absolute inset-0 bg-slate-900/60 mix-blend-multiply' />
        <div className='absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent' />
        <div className='absolute inset-0 bg-indigo-900/20' />

        <InteractiveGridPattern
          className={cn(
            'mask-[radial-gradient(800px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-0 h-full skew-y-12 opacity-30 mix-blend-overlay'
          )}
        />

        <div className='relative z-20 flex h-full flex-col justify-between p-12 xl:p-16 text-white'>
          <Link
            to='/'
            className='inline-flex items-center text-lg font-medium outline-none transition-transform active:scale-95 w-max cursor-pointer'
            aria-label='Return to homepage'
          >
            <NexSpaceLogo variant='horizontal' inverted className='h-10 w-auto' />
          </Link>

          <div className='mt-auto max-w-lg'>
            <blockquote className='space-y-6 relative z-10'>
              <p className='text-2xl font-medium leading-relaxed font-display-hero text-white/95 drop-shadow-lg'>
                "NexSpace completely transformed how our team discovers and books flexible offices
                globally. The experience is seamless."
              </p>
              <footer className='text-indigo-200 text-base font-medium flex items-center gap-3'>
                <div className='h-px w-8 bg-indigo-400/50'></div>
                Sarah Jenkins, VP of Operations
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpViewPage() {
  return <SignUpContent />;
}
