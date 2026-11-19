import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from '@tanstack/react-router';
import {
  Building2,
  Check,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  CalendarCheck,
  SlidersHorizontal,
  Compass,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';
import { NexSpaceLogo } from '@/components/brand/logo';
import { useLanguage } from '../context/language-context';
import { useCurrency } from '../context/currency-context';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole, getRoleHomeUrl } from '@/features/auth/utils/role-guard';
import { UserNav } from '@/components/layout/user-nav';

interface NavbarProps {
  sticky?: boolean;
}

export function Navbar({ sticky = true }: NavbarProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = getUserRole(user);

  const handleMobileNavigate = (to: string) => {
    setMobileMenuOpen(false);
    navigate({ to });
  };

  const handleHowItWorksClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const target = document.getElementById('how-it-works');
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      className={`${
        sticky ? 'sticky top-0 z-50' : 'relative z-30'
      } w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-slate-950/90`}
    >
      <div className='flex h-16 sm:h-[68px] w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-12'>
        {/* Brand Logo - Aligned to left corner */}
        <div className='flex flex-1 items-center justify-start shrink-0'>
          <button
            type='button'
            onClick={() => navigate({ to: getRoleHomeUrl(user) })}
            className='flex cursor-pointer items-center rounded-lg border-none bg-transparent p-1 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none'
            title='NexSpace Home'
            aria-label='NexSpace Home'
          >
            <NexSpaceLogo className='h-8 sm:h-9 w-auto cursor-pointer' />
          </button>
        </div>

        {/* Center Primary Navigation (Single-line, strictly centered) */}
        <nav
          aria-label='Primary Navigation'
          className='hidden md:flex shrink-0 items-center justify-center gap-5 lg:gap-7 whitespace-nowrap'
        >
          <Link
            to='/workspaces'
            className='whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:text-slate-300 dark:hover:text-white'
            activeProps={{
              className:
                'whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#4b41e1] dark:text-indigo-400'
            }}
          >
            {t('nav.exploreWorkspaces')}
          </Link>

          <a
            href='/#how-it-works'
            onClick={handleHowItWorksClick}
            className='whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:text-slate-300 dark:hover:text-white'
          >
            {t('nav.howItWorks')}
          </a>

          <Link
            to='/organizer/apply'
            className='whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:text-slate-300 dark:hover:text-white'
            activeProps={{
              className:
                'whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#4b41e1] dark:text-indigo-400'
            }}
          >
            {t('nav.listSpace')}
          </Link>

          {isAuthenticated && userRole === 'USER' && (
            <>
              <Link
                to='/workspaces/my-bookings'
                className='whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:text-slate-300 dark:hover:text-white'
                activeProps={{
                  className:
                    'whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#4b41e1] dark:text-indigo-400'
                }}
              >
                {t('nav.myBookings')}
              </Link>
              <Link
                to='/dashboard/preferences'
                className='hidden lg:inline-flex whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:text-slate-300 dark:hover:text-white'
                activeProps={{
                  className:
                    'hidden lg:inline-flex whitespace-nowrap shrink-0 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#4b41e1] dark:text-indigo-400'
                }}
              >
                {t('nav.preferences')}
              </Link>
            </>
          )}
        </nav>

        {/* Right Controls - Aligned to right corner */}
        <div className='flex flex-1 items-center justify-end gap-2 sm:gap-2.5 whitespace-nowrap'>
          {/* Utility Capsule: Theme, Language, Currency */}
          <div className='flex items-center rounded-full border border-slate-200/90 bg-slate-50/80 p-0.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900/80'>
            <ThemeModeToggle compact />

            <div className='mx-0.5 h-3.5 w-px bg-slate-200 dark:bg-slate-800' />

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  aria-label='Chuyển đổi ngôn ngữ / Switch Language'
                  className='flex h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                >
                  <span className='text-[11px] font-bold uppercase tracking-wider'>
                    {language}
                  </span>
                  <ChevronDown className='h-3 w-3 opacity-60' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-40 p-1.5 shadow-lg'>
                <DropdownMenuItem
                  onSelect={() => setLanguage('vi')}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
                    language === 'vi'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <span>🇻🇳</span>
                    <span>Tiếng Việt</span>
                  </div>
                  {language === 'vi' && (
                    <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setLanguage('en')}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
                    language === 'en'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <span>🇺🇸</span>
                    <span>English</span>
                  </div>
                  {language === 'en' && (
                    <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className='hidden sm:block mx-0.5 h-3.5 w-px bg-slate-200 dark:bg-slate-800' />

            {/* Currency Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  aria-label='Change Currency'
                  className='hidden sm:flex h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                >
                  <span className='text-[11px] font-bold uppercase tracking-wider'>
                    {currency === 'VND' ? '₫ VND' : '$ USD'}
                  </span>
                  <ChevronDown className='h-3 w-3 opacity-60' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-40 p-1.5 shadow-lg'>
                <DropdownMenuItem
                  onSelect={() => setCurrency('USD')}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
                    currency === 'USD'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span>USD ($)</span>
                  {currency === 'USD' && (
                    <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setCurrency('VND')}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
                    currency === 'VND'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <span>VND (₫)</span>
                  {currency === 'VND' && (
                    <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Auth / Account Controls */}
          {isAuthenticated ? (
            <div className='flex items-center gap-2 pl-0.5'>
              {userRole === 'ADMIN' && (
                <button
                  type='button'
                  onClick={() => {
                    useAuthStore.getState().setAdminViewMode('admin');
                    navigate({ to: '/dashboard/overview' });
                  }}
                  className='hidden sm:inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer'
                >
                  <ShieldCheck className='size-3.5' />
                  <span>{t('nav.adminPortal')}</span>
                </button>
              )}
              {userRole === 'ORGANIZER' && (
                <button
                  type='button'
                  onClick={() => navigate({ to: '/dashboard/organizer' })}
                  className='hidden sm:inline-flex whitespace-nowrap items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer'
                >
                  <Building2 className='size-3.5' />
                  <span>{t('nav.organizerPortal')}</span>
                </button>
              )}
              <UserNav />
            </div>
          ) : (
            <Link
              to='/auth/sign-in'
              search={(() => {
                const currentPath =
                  typeof window !== 'undefined' && window.location.pathname !== '/'
                    ? window.location.pathname + window.location.search
                    : undefined;
                return currentPath ? { redirect: currentPath } : undefined;
              })()}
              className='hidden sm:inline-flex whitespace-nowrap shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#4b41e1] hover:bg-[#4338CA] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none'
            >
              {t('nav.signIn')}
            </Link>
          )}

          {/* Mobile Hamburger Menu */}
          <div className='md:hidden'>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type='button'
                  aria-label='Open Navigation Menu'
                  className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                >
                  {mobileMenuOpen ? <X className='h-4 w-4' /> : <Menu className='h-4 w-4' />}
                </button>
              </SheetTrigger>
              <SheetContent side='right' className='w-80 p-6 flex flex-col justify-between'>
                <div>
                  <SheetHeader className='text-left border-b border-slate-200/80 dark:border-slate-800 pb-4'>
                    <SheetTitle className='text-base font-bold'>NexSpace</SheetTitle>
                    <SheetDescription className='sr-only'>
                      {language === 'vi'
                        ? 'Menu điều hướng chính của NexSpace'
                        : 'NexSpace main navigation menu'}
                    </SheetDescription>
                  </SheetHeader>

                  {/* Mobile Nav Links */}
                  <nav aria-label='Mobile Navigation' className='mt-5 flex flex-col gap-1.5'>
                    <button
                      type='button'
                      onClick={() => handleMobileNavigate('/workspaces')}
                      className='flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/70'
                    >
                      <Compass className='size-4 text-[#4b41e1] dark:text-indigo-400' />
                      <span>{t('nav.exploreWorkspaces')}</span>
                    </button>

                    <a
                      href='/#how-it-works'
                      onClick={handleHowItWorksClick}
                      className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/70'
                    >
                      <Sparkles className='size-4 text-[#4b41e1] dark:text-indigo-400' />
                      <span>{t('nav.howItWorks')}</span>
                    </a>

                    <button
                      type='button'
                      onClick={() => handleMobileNavigate('/organizer/apply')}
                      className='flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/70'
                    >
                      <Building2 className='size-4 text-[#4b41e1] dark:text-indigo-400' />
                      <span>{t('nav.listSpace')}</span>
                    </button>

                    {isAuthenticated && userRole === 'USER' && (
                      <>
                        <button
                          type='button'
                          onClick={() => handleMobileNavigate('/workspaces/my-bookings')}
                          className='flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/70'
                        >
                          <CalendarCheck className='size-4 text-[#4b41e1] dark:text-indigo-400' />
                          <span>{t('nav.myBookings')}</span>
                        </button>
                        <button
                          type='button'
                          onClick={() => handleMobileNavigate('/dashboard/preferences')}
                          className='flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800/70'
                        >
                          <SlidersHorizontal className='size-4 text-[#4b41e1] dark:text-indigo-400' />
                          <span>{t('nav.preferences')}</span>
                        </button>
                      </>
                    )}
                  </nav>

                  {/* Mobile Preferences: Language & Currency */}
                  <div className='mt-6 border-t border-slate-200/80 dark:border-slate-800 pt-5 space-y-4'>
                    <div>
                      <span className='block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2'>
                        {language === 'vi' ? 'Ngôn ngữ' : 'Language'}
                      </span>
                      <div className='grid grid-cols-2 gap-2'>
                        <button
                          type='button'
                          onClick={() => setLanguage('vi')}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                            language === 'vi'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
                          }`}
                        >
                          🇻🇳 Tiếng Việt
                        </button>
                        <button
                          type='button'
                          onClick={() => setLanguage('en')}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                            language === 'en'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
                          }`}
                        >
                          🇺🇸 English
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className='block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2'>
                        {language === 'vi' ? 'Tiền tệ' : 'Currency'}
                      </span>
                      <div className='grid grid-cols-2 gap-2'>
                        <button
                          type='button'
                          onClick={() => setCurrency('USD')}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                            currency === 'USD'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
                          }`}
                        >
                          $ USD
                        </button>
                        <button
                          type='button'
                          onClick={() => setCurrency('VND')}
                          className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                            currency === 'VND'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
                          }`}
                        >
                          ₫ VND
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Auth Footer */}
                <div className='border-t border-slate-200/80 dark:border-slate-800 pt-4'>
                  {isAuthenticated ? (
                    <div className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900'>
                      <div className='flex items-center gap-3 min-w-0'>
                        <UserNav />
                        <div className='flex flex-col text-left min-w-0'>
                          <span className='text-xs font-bold text-slate-900 dark:text-white truncate'>
                            {user?.fullName || user?.userName}
                          </span>
                          <span className='text-[11px] text-slate-500 dark:text-slate-400 truncate'>
                            {user?.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className='w-full cursor-pointer rounded-xl bg-[#4b41e1] hover:bg-[#4338CA] py-2.5 text-sm font-semibold text-white shadow-xs'
                      onClick={() => {
                        const currentPath =
                          typeof window !== 'undefined' && window.location.pathname !== '/'
                            ? window.location.pathname + window.location.search
                            : undefined;
                        handleMobileNavigate(
                          currentPath ? `/auth/sign-in?redirect=${encodeURIComponent(currentPath)}` : '/auth/sign-in'
                        );
                      }}
                    >
                      {t('nav.signIn')}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
