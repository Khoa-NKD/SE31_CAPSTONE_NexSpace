import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  Building2,
  Calendar,
  ChevronDown,
  MapPin,
  Monitor,
  Search,
  SlidersHorizontal,
  User,
  Users,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../context/language-context';
import type { WorkspaceType } from '../api/types';

export interface SearchCriteria {
  mode: WorkspaceType | 'all';
  location: string;
  dateTime?: string;
  capacity: string;
}

export interface ModeOption {
  id: WorkspaceType | 'all';
  labelKey: string;
  categoryParam?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const MODE_OPTIONS: ModeOption[] = [
  { id: 'all', labelKey: 'search.allTypes', icon: Building2 },
  { id: 'hot-desk', labelKey: 'search.hotDesk', categoryParam: 'COWORKING_HUB', icon: Monitor },
  {
    id: 'dedicated-desk',
    labelKey: 'search.dedicatedDesk',
    categoryParam: 'COWORKING_HUB',
    icon: User
  },
  {
    id: 'meeting-room',
    labelKey: 'search.meetingRoom',
    categoryParam: 'MEETING_SUITE',
    icon: Users
  },
  {
    id: 'private-office',
    labelKey: 'search.privateOffice',
    categoryParam: 'PRIVATE_OFFICE',
    icon: Building2
  }
];

export const getDateOptions = (language: 'vi' | 'en') => [
  {
    value: 'today-flexible',
    label: language === 'vi' ? 'Hôm nay, Giờ linh hoạt' : 'Today, Flexible hours'
  },
  {
    value: 'tomorrow-business',
    label: language === 'vi' ? 'Ngày mai, 08:00 - 17:00' : 'Tomorrow, 08:00 - 17:00'
  },
  {
    value: 'this-week',
    label: language === 'vi' ? 'Trong tuần này' : 'This week'
  },
  {
    value: 'custom-monthly',
    label: language === 'vi' ? 'Thuê theo ngày / tháng' : 'Full day / Monthly pass'
  }
];

export const CAPACITY_OPTIONS = ['1 - 4 People', '5 - 10 People', '10+ People'];

interface SearchCardProps {
  criteria?: SearchCriteria;
  onChangeCriteria?: (criteria: SearchCriteria) => void;
  onSearch?: (criteria: SearchCriteria) => void;
  onFilterChange?: (criteria: SearchCriteria) => void;
}

export function SearchCard({
  criteria,
  onChangeCriteria,
  onSearch,
  onFilterChange
}: SearchCardProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const isControlled = criteria !== undefined;
  const [internalMode, setInternalMode] = useState<WorkspaceType | 'all'>('all');
  const [internalLocation, setInternalLocation] = useState('');
  const [internalDateTime, setInternalDateTime] = useState('today-flexible');
  const [internalCapacity, setInternalCapacity] = useState('1 - 4 People');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const activeMode = isControlled ? criteria.mode : internalMode;
  const location = isControlled ? criteria.location : internalLocation;
  const dateTime = isControlled ? criteria.dateTime || 'today-flexible' : internalDateTime;
  const capacity = isControlled ? criteria.capacity : internalCapacity;

  const modeOptions = MODE_OPTIONS;
  const dateOptions = getDateOptions(language);
  const quickLocations = ['Đà Nẵng', 'Sơn Trà', 'Hải Châu', 'Hội An'];

  const notifyFilterChange = (next: Partial<SearchCriteria>) => {
    const updated: SearchCriteria = {
      mode: next.mode !== undefined ? next.mode : activeMode,
      location: next.location !== undefined ? next.location : location,
      dateTime: next.dateTime !== undefined ? next.dateTime : dateTime,
      capacity: next.capacity !== undefined ? next.capacity : capacity
    };

    if (!isControlled) {
      if (next.mode !== undefined) setInternalMode(next.mode);
      if (next.location !== undefined) setInternalLocation(next.location);
      if (next.dateTime !== undefined) setInternalDateTime(next.dateTime);
      if (next.capacity !== undefined) setInternalCapacity(next.capacity);
    }

    onChangeCriteria?.(updated);
    onFilterChange?.(updated);
  };

  const handleModeChange = (mode: WorkspaceType | 'all') => {
    notifyFilterChange({ mode });
  };

  const handleLocationChange = (val: string) => {
    notifyFilterChange({ location: val });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const criteria: SearchCriteria = {
      mode: activeMode,
      location: location.trim(),
      dateTime,
      capacity
    };
    onSearch?.(criteria);

    const selectedModeObj = modeOptions.find((m) => m.id === activeMode);
    const searchParams: Record<string, string> = {};
    if (location.trim()) {
      searchParams.search = location.trim();
    }
    if (selectedModeObj?.categoryParam) {
      searchParams.category = selectedModeObj.categoryParam;
    }
    if (activeMode !== 'all') {
      searchParams.type = activeMode;
    }
    if (capacity) {
      searchParams.capacity = capacity;
    }

    navigate({
      to: '/workspaces',
      search: searchParams as never
    });
  };

  return (
    <div
      id='landing-search-card'
      className='mx-auto mt-7 max-w-5xl rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 text-left shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900'
    >
      {/* Primary Horizontal Search Form */}
      <form
        onSubmit={handleSearch}
        className='flex flex-col md:flex-row md:items-end gap-3'
      >
        {/* 1. Location */}
        <div className='flex-[1.4] min-w-0 space-y-1.5'>
          <label
            htmlFor='search-location'
            className='block text-xs font-semibold text-slate-700 dark:text-slate-300'
          >
            {t('search.locationLabel')}
          </label>
          <div className='relative flex items-center'>
            <MapPin className='pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400' />
            <input
              id='search-location'
              type='text'
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder={t('search.locationPlaceholder')}
              className='h-11 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-8 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-[#4b41e1] focus:bg-white focus:ring-2 focus:ring-[#4b41e1]/20 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:focus:bg-slate-950'
            />
            {location && (
              <button
                type='button'
                onClick={() => handleLocationChange('')}
                aria-label={language === 'vi' ? 'Xóa địa điểm' : 'Clear location'}
                className='absolute right-2.5 rounded-full p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-800'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>
        </div>

        {/* 2. Date & Time */}
        <div className='flex-1 min-w-0 space-y-1.5'>
          <label
            htmlFor='search-datetime'
            className='block text-xs font-semibold text-slate-700 dark:text-slate-300'
          >
            {t('search.dateLabel')}
          </label>
          <div className='relative flex items-center'>
            <Calendar className='pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400' />
            <select
              id='search-datetime'
              value={dateTime}
              onChange={(e) => {
                notifyFilterChange({ dateTime: e.target.value });
              }}
              className='h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-8 text-sm text-slate-900 transition-colors focus:border-[#4b41e1] focus:bg-white focus:ring-2 focus:ring-[#4b41e1]/20 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:focus:bg-slate-950'
            >
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className='pointer-events-none absolute right-3 h-4 w-4 text-slate-400' />
          </div>
        </div>

        {/* 3. Workspace Type */}
        <div className='flex-1 min-w-0 space-y-1.5'>
          <label
            htmlFor='search-workspace-type'
            className='block text-xs font-semibold text-slate-700 dark:text-slate-300'
          >
            {t('search.typeLabel')}
          </label>
          <div className='relative flex items-center'>
            <Building2 className='pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400' />
            <select
              id='search-workspace-type'
              value={activeMode}
              onChange={(e) => handleModeChange(e.target.value as WorkspaceType | 'all')}
              className='h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-8 text-sm text-slate-900 transition-colors focus:border-[#4b41e1] focus:bg-white focus:ring-2 focus:ring-[#4b41e1]/20 focus:outline-none dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:focus:bg-slate-950'
            >
              {modeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <ChevronDown className='pointer-events-none absolute right-3 h-4 w-4 text-slate-400' />
          </div>
        </div>

        {/* 4. Search Action CTA */}
        <div className='shrink-0 space-y-1.5'>
          <label className='invisible hidden md:block text-xs font-semibold select-none' aria-hidden='true'>
            &nbsp;
          </label>
          <Button
            type='submit'
            className='group h-11 w-full md:w-auto cursor-pointer rounded-xl bg-[#4b41e1] hover:bg-[#3f36c8] px-6 text-sm font-bold text-white shadow-md shadow-[#4b41e1]/25 transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2'
          >
            <Search className='h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110' />
            <span className='whitespace-nowrap'>{t('search.btn')}</span>
          </Button>
        </div>
      </form>

      {/* Progressive Disclosure Footer: Quick Space Type Pills, Popular Locations & Capacity */}
      <div className='mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80'>
        {/* Quick Category & Location Chips */}
        <div className='flex flex-wrap items-center gap-1.5'>
          {modeOptions.slice(1).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                type='button'
                onClick={() => handleModeChange(isActive ? 'all' : tab.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-[#4b41e1] font-semibold border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className='h-3.5 w-3.5' />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}

          <span className='hidden sm:inline-block mx-1 h-3.5 w-px bg-slate-200 dark:bg-slate-800' />

          <div className='hidden lg:flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400'>
            <span>{t('search.quickPopular')}</span>
            {quickLocations.map((loc) => (
              <button
                key={loc}
                type='button'
                onClick={() => handleLocationChange(location === loc ? '' : loc)}
                className={`cursor-pointer rounded-md px-2 py-0.5 text-xs transition-colors ${
                  location === loc
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium'
                    : 'hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Progressive Disclosure for Capacity / Guests */}
        <div className='flex items-center gap-2'>
          {showMoreOptions ? (
            <div className='flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-950'>
              <User className='h-3.5 w-3.5 text-slate-400' />
              <label htmlFor='search-capacity' className='sr-only'>
                {t('search.capacityLabel')}
              </label>
              <select
                id='search-capacity'
                value={capacity}
                onChange={(e) => {
                  notifyFilterChange({ capacity: e.target.value });
                }}
                className='cursor-pointer bg-transparent text-xs font-medium text-slate-700 outline-none dark:text-slate-200'
              >
                <option value='1 - 4 People'>
                  {language === 'vi' ? '1 - 4 Người' : '1 - 4 People'}
                </option>
                <option value='5 - 12 People (Team)'>
                  {language === 'vi' ? '5 - 12 Người (Nhóm)' : '5 - 12 People (Team)'}
                </option>
                <option value='13 - 30 People (Department)'>
                  {language === 'vi' ? '13 - 30 Người (Phòng ban)' : '13 - 30 People (Department)'}
                </option>
                <option value='30+ People (Full Floor)'>
                  {language === 'vi' ? '30+ Người (Nguyên sàn)' : '30+ People (Full Floor)'}
                </option>
              </select>
            </div>
          ) : (
            <button
              type='button'
              onClick={() => setShowMoreOptions(true)}
              className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
            >
              <SlidersHorizontal className='h-3.5 w-3.5' />
              <span>
                {t('search.capacityLabel')}:{' '}
                <strong className='font-semibold text-slate-800 dark:text-slate-200'>
                  {language === 'vi' && capacity === '1 - 4 People' ? '1 - 4 Người' : capacity}
                </strong>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
