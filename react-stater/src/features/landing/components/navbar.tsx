import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Building2, Check, ChevronDown, Menu, X, DoorClosed, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';
import { NexSpaceLogo } from '@/components/brand/logo';
import { useLanguage } from '../context/language-context';
import { useCurrency } from '../context/currency-context';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();

  const handleMobileNavigate = (to: string) => {
    setMobileMenuOpen(false);
    navigate({ to });
  };

  const navItems = [
    { label: t('nav.workspaces'), href: '#workspaces' },
    { label: t('nav.platform'), href: '#platform' },
    { label: t('nav.reviews'), href: '#reviews' },
    { label: t('nav.resources'), href: '#resources' }
  ];

  const solutionItems = [
    {
      title: t('solutions.enterprise.title'),
      description: t('solutions.enterprise.desc'),
      href: '#enterprise'
    },
    {
      title: t('solutions.teams.title'),
      description: t('solutions.teams.desc'),
      href: '#teams'
    },
    {
      title: t('solutions.landlords.title'),
      description: t('solutions.landlords.desc'),
      href: '#list-space'
    }
  ];

  return (
    <header className='border-border/80 sticky top-0 z-50 w-full border-b bg-white/85 backdrop-blur-md transition-all dark:bg-slate-950/85'>
      <div className='mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-6 lg:px-12'>
        {/* Brand Logo */}
        <div className='flex items-center gap-6'> {/* Increased gap from gap-3 to gap-6 */}
          <a
            href='/'
            className='focus-visible:ring-indigo-600 flex items-center gap-4 rounded-lg p-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2'
          >
            <NexSpaceLogo className='mr-8 h-9 w-auto cursor-pointer' />
          </a>
        </div>

        {/* Center Desktop Navigation */}
        <nav aria-label='Main Navigation' className='hidden items-center space-x-7 md:flex'>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className='text-muted-foreground hover:text-foreground text-sm font-medium transition-colors duration-150 active:scale-[0.98]'
            >
              {item.label}
            </a>
          ))}

          {/* Solutions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type='button'
                className='text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-sm font-medium transition-colors outline-none active:scale-[0.98]'
              >
                <span>{t('nav.solutions')}</span>
                <ChevronDown className='h-4 w-4 transition-transform duration-200' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-72 p-2 shadow-lg'>
              {solutionItems.map((solution) => (
                <DropdownMenuItem key={solution.title} asChild className='cursor-pointer'>
                  <a
                    href={solution.href}
                    className='hover:bg-muted flex flex-col items-start rounded-lg p-2.5 transition-colors'
                  >
                    <span className='text-foreground text-sm font-semibold'>{solution.title}</span>
                    <span className='text-muted-foreground text-xs'>{solution.description}</span>
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right Trailing Actions */}
        <div className='flex items-center space-x-1.5 sm:space-x-2'>
          {/* Zone 1: Secondary Access Text Links */}
          {/* 1. Partner Action: List Your Space (Sleek text link with Host indicator) */}
          <a
            href='#list-space'
            className='group hidden cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-indigo-600 xl:inline-flex dark:hover:text-indigo-400'
          >
            <Building2 className='h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-hover:scale-110 group-hover:text-indigo-600 dark:group-hover:text-indigo-400' />
            <span>{t('nav.listSpace')}</span>
            <span className='rounded-full bg-indigo-600/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-400/20 dark:text-indigo-300'>
              {t('nav.hostBadge')}
            </span>
          </a>



          {/* Hairline Divider between Links and Controls */}
          <div className='hidden h-4 w-px bg-border/60 sm:block' />

          {/* Zone 2: Micro-Utility Capsule (Unified Theme Toggle & Language Dropdown) */}
          <div className='flex items-center rounded-full border border-border/80 bg-background/80 p-0.5 shadow-2xs backdrop-blur-md'>
            {/* Embedded Compact Theme Mode Toggle */}
            <ThemeModeToggle compact />

            {/* Micro Divider */}
            <div className='mx-0.5 h-3.5 w-px bg-border/70' />

            {/* Embedded Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  aria-label='Chuyển đổi ngôn ngữ / Switch Language'
                  className='flex h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95 outline-none'
                >
                  <span className='text-sm leading-none'>{language === 'vi' ? '🇻🇳' : '🇺🇸'}</span>
                  <span className='text-[11px] font-bold uppercase tracking-wider'>{language}</span>
                  <ChevronDown className='h-3 w-3 opacity-60' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44 p-1.5 shadow-lg'>
                <DropdownMenuItem
                  onSelect={() => setLanguage('vi')}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
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
                  onSelect={() => setLanguage('en')}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
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

            {/* Micro Divider */}
            <div className='mx-0.5 h-3.5 w-px bg-border/70' />

            {/* Embedded Currency Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type='button'
                  aria-label='Change Currency'
                  className='flex h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95 outline-none'
                >
                  <span className='text-sm leading-none font-bold'>
                    {currency === 'VND' ? '₫' : '$'}
                  </span>
                  <span className='text-[11px] font-bold uppercase tracking-wider'>{currency}</span>
                  <ChevronDown className='h-3 w-3 opacity-60' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44 p-1.5 shadow-lg'>
                <DropdownMenuItem
                  onSelect={() => setCurrency('USD')}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
                    currency === 'USD'
                      ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <div className='flex items-center gap-2'>
                    <span className='text-base leading-none font-bold'>$</span>
                    <span>USD ($)</span>
                  </div>
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
                  <div className='flex items-center gap-2'>
                    <span className='text-base leading-none font-bold'>₫</span>
                    <span>VND (₫)</span>
                  </div>
                  {currency === 'VND' && (
                    <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Zone 3: Sole Radiant CTA Button */}
          <Link
            to='/auth/sign-in'
            className='group flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-[#4338CA] px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all duration-300 hover:from-indigo-500 hover:to-[#3730A3] hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]'
          >
            <span>{t('nav.signIn')}</span>
            <div className="relative h-3.5 w-3.5">
              <DoorClosed className="absolute inset-0 h-3.5 w-3.5 transition-all duration-300 group-hover:opacity-0 group-hover:scale-75" />
              <DoorOpen className="absolute inset-0 h-3.5 w-3.5 opacity-0 scale-75 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100" />
            </div>
          </Link>

          {/* Mobile Menu Hamburger */}
          <div className='md:hidden'>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type='button'
                  aria-label='Open Navigation Menu'
                  className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border/80 text-muted-foreground hover:text-foreground'
                >
                  {mobileMenuOpen ? <X className='h-4 w-4' /> : <Menu className='h-4 w-4' />}
                </button>
              </SheetTrigger>
              <SheetContent side='right' className='w-80 p-6'>
                <SheetHeader className='text-left'>
                  <SheetTitle className='text-lg font-bold'>Menu</SheetTitle>
                </SheetHeader>
                <div className='mt-6 flex flex-col gap-4'>
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className='py-2 text-base font-medium text-foreground transition-colors hover:text-indigo-600'
                    >
                      {item.label}
                    </a>
                  ))}

                  <div className='my-2 border-t border-border/60 pt-4'>
                    <div className='mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                      {t('nav.solutions')}
                    </div>
                    {solutionItems.map((solution) => (
                      <a
                        key={solution.title}
                        href={solution.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className='block rounded-lg p-2 hover:bg-muted'
                      >
                        <div className='text-sm font-semibold text-foreground'>
                          {solution.title}
                        </div>
                        <div className='text-xs text-muted-foreground'>{solution.description}</div>
                      </a>
                    ))}
                  </div>

                  <div className='my-2 flex flex-col gap-2.5 border-t border-border/60 pt-4'>
                    <a
                      href='#list-space'
                      onClick={() => setMobileMenuOpen(false)}
                      className='flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200/90 bg-indigo-50/80 py-2.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800/80 dark:bg-indigo-950/60 dark:text-indigo-300'
                    >
                      <Building2 className='h-4 w-4' />
                      <span>{t('nav.listSpace')}</span>
                      <span className='rounded-md bg-indigo-600/10 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider dark:bg-indigo-400/20'>
                        {t('nav.hostBadge')}
                      </span>
                    </a>
                    <Button
                      className='group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-[#4338CA] py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all duration-300 hover:from-indigo-500 hover:to-[#3730A3] hover:shadow-lg active:scale-95'
                      onClick={() => handleMobileNavigate('/auth/sign-in')}
                    >
                      <span>{t('nav.signIn')}</span>
                      <div className="relative h-4 w-4">
                        <DoorClosed className="absolute inset-0 h-4 w-4 transition-all duration-300 group-hover:opacity-0 group-hover:scale-75" />
                        <DoorOpen className="absolute inset-0 h-4 w-4 opacity-0 scale-75 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100" />
                      </div>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
