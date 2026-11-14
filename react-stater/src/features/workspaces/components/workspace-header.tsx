import React from 'react';
import { Globe, ChevronDown, Check, DoorClosed, Home } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Icons } from '@/components/icons';
import { useLanguage } from '@/features/landing/context/language-context';
import { useCurrency } from '@/features/landing/context/currency-context';
import { ThemeModeToggle } from '@/components/themes/theme-mode-toggle';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getRoleHomeUrl } from '@/features/auth/utils/role-guard';
import { UserNav } from '@/components/layout/user-nav';

export function WorkspaceHeader() {
  const { language, setLanguage } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const homeUrl = getRoleHomeUrl(user);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/90 shadow-sm backdrop-blur-md dark:bg-card/90 dark:shadow-none">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-6 lg:px-12">
        {/* Brand Logo Anchor */}
        <div className="flex items-center gap-8">
          <Link to={homeUrl} className="mr-8 flex items-center transition-opacity hover:opacity-80 active:scale-95 duration-200">
            <Icons.nexSpace className="h-9 w-auto cursor-pointer object-contain" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
            >
              <Home className="h-4 w-4" />
              <span>{language === 'vi' ? 'Trang chủ' : 'Home'}</span>
            </Link>
            {/* Active: Workspaces */}
            <Link
              to="/workspaces"
              className="text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
              activeProps={{ className: "border-b-2 border-[#4b41e1] pb-1 font-semibold text-[#4b41e1]" }}
            >
              Workspaces
            </Link>
            {isAuthenticated && (
              <Link
                to="/dashboard/preferences"
                className="text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
                activeProps={{ className: "border-b-2 border-[#4b41e1] pb-1 font-semibold text-[#4b41e1]" }}
              >
                {language === 'vi' ? 'Sở thích không gian' : 'Space Preferences'}
              </Link>
            )}
            <Link
              to="/workspaces/my-bookings"
              className="text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
              activeProps={{ className: "border-b-2 border-[#4b41e1] pb-1 font-semibold text-[#4b41e1]" }}
            >
              {language === 'vi' ? 'Đơn của tôi' : 'My Bookings'}
            </Link>

            {/* Dropdown Solutions gọn gàng, chống tràn layout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-[0.98] outline-none cursor-pointer"
                >
                  <span>{language === 'vi' ? 'Giải pháp' : 'Solutions'}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 p-1.5 shadow-lg">
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/" className="text-xs font-medium">Enterprise</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/" className="text-xs font-medium">Network</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/" className="text-xs font-medium">Pricing</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Trailing Action Cluster - shrink-0 ngăn ngừa tuyệt đối việc bị đè */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Theme Toggle */}
          <ThemeModeToggle />

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground hover:shadow-sm active:scale-95 cursor-pointer outline-none" 
                title="Change Language"
              >
                <Globe className="h-[16px] w-[16px] transition-transform group-hover:rotate-12" />
                <span className="uppercase">{language}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
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

          {/* Currency Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="group flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground hover:shadow-sm active:scale-95 cursor-pointer outline-none" 
                title="Change Currency"
              >
                <span className="text-sm font-bold leading-none">{currency === 'VND' ? '₫' : '$'}</span>
                <span className="uppercase">{currency}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
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
          
          <div className="mx-1 h-4 w-[1px] bg-border"></div>
          
          {/* Secondary Action: List Your Space */}
          <Link
            to="/"
            className="hidden items-center rounded-lg px-3.5 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:shadow-sm hover:-translate-y-0.5 active:scale-95 active:translate-y-0 sm:inline-flex"
          >
            List Your Space
          </Link>
          
          {/* Authenticated User Profile Menu OR Sign In Button */}
          {user || isAuthenticated ? (
            <div className="ml-2 flex items-center">
              <UserNav />
            </div>
          ) : (
            <Link
              to='/auth/sign-in'
              className='group flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-[#4338CA] px-4 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all duration-300 hover:from-indigo-500 hover:to-[#3730A3] hover:shadow-lg active:scale-95'
            >
              <span>{language === 'vi' ? 'Đăng nhập' : 'Sign in'}</span>
              <DoorClosed className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

