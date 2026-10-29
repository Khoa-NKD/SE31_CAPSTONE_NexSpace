import { Link } from '@tanstack/react-router';
import { NexSpaceLogo } from '@/components/brand/logo';
import { ChevronDown, Check, ArrowLeft, Building2, ShieldCheck, Gauge } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';
import { useLanguage } from '../../landing/context/language-context';
import { ResetPasswordForm } from './reset-password-form';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export default function ResetPasswordViewPage() {
  const { language, setLanguage, t } = useLanguage();

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
          alt='Premium Workspace Security'
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
              <ShieldCheck className='w-3.5 h-3.5 text-emerald-400' />
              <span className='font-caption-code text-caption-code tracking-wider uppercase font-semibold text-white'>
                Bank-Grade Security
              </span>
            </div>
          </div>

          {/* Center Architectural Motif */}
          <div className='hidden lg:flex my-auto py-12 flex-col items-start opacity-70 hover:opacity-100 transition-opacity duration-300'>
            <div className='border-l-2 border-indigo-400/40 pl-6 space-y-2'>
              <div className='font-caption-code text-caption-code uppercase tracking-widest text-indigo-400'>
                Security Protocol • Auth Zero
              </div>
              <div className='font-headline-sm text-headline-sm text-white font-semibold tracking-tight'>
                Encrypted Identity Management
              </div>
              <div className='flex items-center gap-3 pt-2 text-slate-300'>
                <span className='inline-flex items-center gap-1.5 font-label-sm text-label-sm'>
                  <ShieldCheck className='w-4 h-4' />
                  256-bit SSL
                </span>
                <span className='text-slate-500'>•</span>
                <span className='inline-flex items-center gap-1.5 font-label-sm text-label-sm'>
                  <Gauge className='w-4 h-4' />
                  Continuous Telemetry
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
                Your digital workspace is protected by enterprise-grade security protocols.
              </p>
              <p className='font-body-base text-body-base text-slate-300'>
                Trusted by security-conscious organizations to protect their sensitive corporate
                real estate data.
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-3 pt-2'>
              <div className='px-3.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2'>
                <Building2 className='w-4 h-4 text-indigo-400' />
                <span className='font-label-base text-label-base font-semibold text-white'>
                  SSO Ready
                </span>
              </div>
              <div className='px-3.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 flex items-center gap-2'>
                <ShieldCheck className='w-4 h-4 text-white' />
                <span className='font-label-base text-label-base font-semibold text-white'>
                  SOC-2 Type II
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right Side: Form Section */}
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
            {t('auth.resetPassword.backToLogin')}
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

        {/* Form Container perfectly centered vertically using flex-1 */}
        <main className='flex flex-1 flex-col items-center justify-center py-10'>
          <ResetPasswordForm />
        </main>
      </motion.div>
    </div>
  );
}
