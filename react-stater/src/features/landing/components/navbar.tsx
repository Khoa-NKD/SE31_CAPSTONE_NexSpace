import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronDown, Globe, Menu, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NexSpaceLogo } from '@/components/brand/logo';
import { MAIN_NAV_ITEMS, SOLUTIONS_ITEMS, SUPPORTED_LANGUAGES } from '../constants/navigation';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  const navigate = useNavigate();

  const handleMobileNavigate = (to: string) => {
    setMobileMenuOpen(false);
    navigate({ to });
  };

  return (
    <header className='bg-card/90 dark:bg-slate-950/90 border-border/80 sticky top-0 z-50 w-full border-b backdrop-blur-md transition-all'>
      <div className='mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-6 lg:px-12'>
        {/* Brand Logo */}
        <div className='flex items-center gap-3'>
          <a
            href='/'
            className='focus-visible:ring-indigo-600 flex items-center gap-2.5 rounded-lg p-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2'
          >
            <NexSpaceLogo className='mr-4 h-9 w-auto cursor-pointer' />
          </a>
        </div>

        {/* Center Desktop Navigation */}
        <nav aria-label='Main Navigation' className='hidden items-center space-x-7 md:flex'>
          {MAIN_NAV_ITEMS.map((item) => (
            <a
              key={item.label}
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
                <span>Solutions</span>
                <ChevronDown className='h-4 w-4 transition-transform duration-200' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-64 p-2 shadow-lg'>
              {SOLUTIONS_ITEMS.map((solution) => (
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
        <div className='flex items-center space-x-3'>
          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type='button'
                aria-label='Select Language'
                title='Select Language'
                className='text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors'
              >
                <Globe className='h-5 w-5' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-36'>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setCurrentLang(lang.code)}
                  className={`cursor-pointer ${currentLang === lang.code ? 'font-semibold text-indigo-600' : ''}`}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to='/auth/sign-in'
            className='text-muted-foreground hover:text-indigo-600 hidden px-3 py-2 text-sm font-medium transition-colors duration-150 sm:inline-block'
          >
            Sign In
          </Link>

          <Button
            asChild
            variant='outline'
            className='border-border hover:bg-muted hidden text-sm font-medium transition-all duration-150 sm:inline-flex active:scale-[0.98]'
          >
            <a href='#list-space'>List Your Space</a>
          </Button>

          <Button
            asChild
            className='bg-[#4b41e1] hover:bg-[#4338CA] text-white shadow-sm transition-all duration-150 active:scale-[0.98]'
          >
            <Link to='/dashboard/overview'>Get Started</Link>
          </Button>

          {/* Mobile Menu Hamburger */}
          <div className='md:hidden'>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type='button'
                  aria-label='Open Navigation Menu'
                  className='text-muted-foreground hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border'
                >
                  {mobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
                </button>
              </SheetTrigger>
              <SheetContent side='right' className='w-80 p-6'>
                <SheetHeader className='text-left'>
                  <SheetTitle className='text-lg font-bold'>Menu</SheetTitle>
                </SheetHeader>
                <div className='mt-6 flex flex-col gap-4'>
                  {MAIN_NAV_ITEMS.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className='text-foreground hover:text-indigo-600 py-2 text-base font-medium transition-colors'
                    >
                      {item.label}
                    </a>
                  ))}

                  <div className='border-border/60 my-2 border-t pt-4'>
                    <div className='text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider'>
                      Solutions
                    </div>
                    {SOLUTIONS_ITEMS.map((solution) => (
                      <a
                        key={solution.title}
                        href={solution.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className='hover:bg-muted block rounded-lg p-2'
                      >
                        <div className='text-foreground text-sm font-semibold'>
                          {solution.title}
                        </div>
                        <div className='text-muted-foreground text-xs'>{solution.description}</div>
                      </a>
                    ))}
                  </div>

                  <div className='border-border/60 my-2 flex flex-col gap-3 border-t pt-4'>
                    <Button
                      variant='outline'
                      className='w-full cursor-pointer'
                      onClick={() => handleMobileNavigate('/auth/sign-in')}
                    >
                      Sign In
                    </Button>
                    <Button
                      className='bg-[#4b41e1] hover:bg-[#4338CA] flex w-full cursor-pointer items-center justify-center gap-2 text-white'
                      onClick={() => handleMobileNavigate('/dashboard/overview')}
                    >
                      <span>Get Started</span>
                      <ArrowRight className='h-4 w-4' />
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
