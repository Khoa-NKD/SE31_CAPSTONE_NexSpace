import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  MapPin,
  Calendar,
  Building2,
  Users,
  Search,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '../context/language-context';
import {
  MODE_OPTIONS,
  getDateOptions,
  CAPACITY_OPTIONS,
  type SearchCriteria
} from './search-card';

interface StickyTopSearchBarProps {
  criteria: SearchCriteria;
  onChangeCriteria: (criteria: SearchCriteria) => void;
  onSearch?: (criteria: SearchCriteria) => void;
  onFilterChange?: (criteria: SearchCriteria) => void;
}

export function StickyTopSearchBar({
  criteria,
  onChangeCriteria,
  onSearch,
  onFilterChange
}: StickyTopSearchBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const dateOptions = getDateOptions(language);

  // Monitor scroll position relative to the hero search card
  useEffect(() => {
    const handleScroll = () => {
      const searchCard = document.getElementById('landing-search-card');
      if (searchCard) {
        const rect = searchCard.getBoundingClientRect();
        // Visible when bottom of hero search card scrolls above viewport top (with 30px buffer)
        setIsVisible(rect.bottom < 30);
      } else {
        setIsVisible(window.scrollY > 350);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleUpdate = (patch: Partial<SearchCriteria>) => {
    const next: SearchCriteria = {
      ...criteria,
      ...patch
    };
    onChangeCriteria(next);
    onFilterChange?.(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(criteria);

    const selectedModeObj = MODE_OPTIONS.find((m) => m.id === criteria.mode);
    const searchParams: Record<string, string> = {};
    if (criteria.location.trim()) {
      searchParams.search = criteria.location.trim();
    }
    if (selectedModeObj?.categoryParam) {
      searchParams.category = selectedModeObj.categoryParam;
    }
    if (criteria.mode !== 'all') {
      searchParams.type = criteria.mode;
    }
    if (criteria.capacity) {
      searchParams.capacity = criteria.capacity;
    }

    navigate({
      to: '/workspaces',
      search: searchParams as never
    });
  };

  const selectedMode = MODE_OPTIONS.find((m) => m.id === criteria.mode) || MODE_OPTIONS[0];
  const selectedDate =
    dateOptions.find((d) => d.value === criteria.dateTime) || dateOptions[0];

  return (
    <aside
      aria-label='Sticky Search Header'
      className={`fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950/95 shadow-lg shadow-slate-900/5 py-2.5 sm:py-3.5 ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className='mx-auto flex w-full max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8'>
        {/* Prominent, Focused Search Bar (No Logo, No Avatar/Language/Currency) */}
        <form onSubmit={handleSubmit} className='w-full'>
          <div className='flex w-full items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-1.5 sm:p-2 shadow-md dark:border-slate-800 dark:bg-slate-900 gap-1.5 sm:gap-2'>
            {/* 1. Location Input */}
            <div className='relative flex flex-1 min-w-[140px] items-center rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors'>
              <MapPin className='pointer-events-none h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400' />
              <input
                type='text'
                value={criteria.location}
                onChange={(e) => handleUpdate({ location: e.target.value })}
                placeholder={
                  language === 'vi'
                    ? 'Thành phố, quận hoặc tên không gian...'
                    : 'City, district, or workspace...'
                }
                aria-label={t('search.locationLabel')}
                className='w-full border-none bg-transparent pl-2 pr-6 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white'
              />
              {criteria.location && (
                <button
                  type='button'
                  onClick={() => handleUpdate({ location: '' })}
                  aria-label='Xóa địa điểm'
                  className='absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className='hidden sm:block h-7 w-px bg-slate-200 dark:bg-slate-700' />

            {/* 2. Date & Time (Desktop / Tablet) */}
            <div className='hidden md:flex shrink-0 items-center rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type='button'
                    className='flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white focus:outline-none'
                  >
                    <Calendar className='h-4 w-4 text-slate-400' />
                    <span className='max-w-[150px] truncate'>{selectedDate.label}</span>
                    <ChevronDown className='h-3.5 w-3.5 opacity-60' />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='center' className='w-60 p-1.5 shadow-lg'>
                  {dateOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onSelect={() => handleUpdate({ dateTime: opt.value })}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
                        criteria.dateTime === opt.value
                          ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {criteria.dateTime === opt.value && (
                        <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Divider */}
            <div className='hidden md:block h-7 w-px bg-slate-200 dark:bg-slate-700' />

            {/* 3. Space Type (Desktop / Tablet) */}
            <div className='hidden sm:flex shrink-0 items-center rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type='button'
                    className='flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white focus:outline-none'
                  >
                    <Building2 className='h-4 w-4 text-slate-400' />
                    <span className='max-w-[140px] truncate'>{t(selectedMode.labelKey)}</span>
                    <ChevronDown className='h-3.5 w-3.5 opacity-60' />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='center' className='w-56 p-1.5 shadow-lg'>
                  {MODE_OPTIONS.map((opt) => {
                    const IconComponent = opt.icon;
                    return (
                      <DropdownMenuItem
                        key={opt.id}
                        onSelect={() => handleUpdate({ mode: opt.id })}
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
                          criteria.mode === opt.id
                            ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <div className='flex items-center gap-2'>
                          <IconComponent className='h-4 w-4 text-slate-400' />
                          <span>{t(opt.labelKey)}</span>
                        </div>
                        {criteria.mode === opt.id && (
                          <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Divider */}
            <div className='hidden lg:block h-7 w-px bg-slate-200 dark:bg-slate-700' />

            {/* 4. Guests / Capacity (Desktop lg+) */}
            <div className='hidden lg:flex shrink-0 items-center rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type='button'
                    className='flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white focus:outline-none'
                  >
                    <Users className='h-4 w-4 text-slate-400' />
                    <span className='max-w-[100px] truncate'>
                      {language === 'vi'
                        ? criteria.capacity.replace('People', 'người')
                        : criteria.capacity}
                    </span>
                    <ChevronDown className='h-3.5 w-3.5 opacity-60' />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='center' className='w-44 p-1.5 shadow-lg'>
                  {CAPACITY_OPTIONS.map((cap) => (
                    <DropdownMenuItem
                      key={cap}
                      onSelect={() => handleUpdate({ capacity: cap })}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium ${
                        criteria.capacity === cap
                          ? 'bg-indigo-50 font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      <span>
                        {language === 'vi' ? cap.replace('People', 'người') : cap}
                      </span>
                      {criteria.capacity === cap && (
                        <Check className='h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400' />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 5. Search Button (Prominent & Clear) */}
            <button
              type='submit'
              className='shrink-0 flex items-center justify-center gap-2 rounded-xl bg-[#4b41e1] hover:bg-[#3f36c8] px-5 sm:px-7 py-2.5 sm:py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none'
            >
              <Search className='h-4 w-4' />
              <span className='hidden sm:inline'>{t('search.btn')}</span>
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
