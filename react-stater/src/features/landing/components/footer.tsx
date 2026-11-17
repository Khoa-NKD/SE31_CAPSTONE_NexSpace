import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CreditCard, Globe } from 'lucide-react';
import { NexSpaceLogo } from '@/components/brand/logo';
import { useLanguage, type Language } from '../context/language-context';
import { useCurrency, type Currency } from '../context/currency-context';

export function Footer() {
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [currentYear] = useState(() => new Date().getFullYear());

  return (
    <footer className='border-t border-slate-200/80 bg-white text-slate-600 dark:border-slate-800/80 dark:bg-slate-950 dark:text-slate-400'>
      <div className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5'>
          {/* Group 1: NexSpace Brand Identity & Description */}
          <div className='sm:col-span-2 space-y-3'>
            <Link to='/' className='inline-block'>
              <NexSpaceLogo className='h-8 w-auto' />
            </Link>
            <p className='max-w-sm text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400'>
              {t('footer.tagline')}
            </p>
          </div>

          {/* Group 2: Explore */}
          <div className='space-y-3'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white'>
              {t('footer.explore')}
            </h3>
            <ul className='space-y-2 text-xs sm:text-sm'>
              <li>
                <Link
                  to='/workspaces'
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.allWorkspaces')}
                </Link>
              </li>
              <li>
                <Link
                  to='/workspaces'
                  search={{ category: 'COWORKING_HUB' } as never}
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.coworkingHubs')}
                </Link>
              </li>
              <li>
                <Link
                  to='/workspaces'
                  search={{ category: 'MEETING_SUITE' } as never}
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.meetingRooms')}
                </Link>
              </li>
              <li>
                <Link
                  to='/workspaces'
                  search={{ category: 'PRIVATE_OFFICE' } as never}
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.privateOffices')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Group 3: Partners */}
          <div className='space-y-3'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white'>
              {t('footer.partners')}
            </h3>
            <ul className='space-y-2 text-xs sm:text-sm'>
              <li>
                <Link
                  to='/organizer/apply'
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.listYourSpace')}
                </Link>
              </li>
              <li>
                <Link
                  to='/organizer/status'
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.partnerStatus')}
                </Link>
              </li>
              <li>
                <Link
                  to='/organizer/documents'
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.partnerGuidelines')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Group 4: Support & Legal */}
          <div className='space-y-3'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white'>
              {t('footer.supportLegal')}
            </h3>
            <ul className='space-y-2 text-xs sm:text-sm'>
              <li>
                <Link
                  to='/about'
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.about')}
                </Link>
              </li>
              <li>
                <Link
                  to='/privacy-policy'
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link
                  to='/terms-of-service'
                  className='transition-colors hover:text-[#4b41e1] dark:hover:text-indigo-400'
                >
                  {t('footer.terms')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-bar: Copyright + Language & Currency */}
        <div className='mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-6 text-xs sm:flex-row dark:border-slate-800/70'>
          <p className='text-slate-500 dark:text-slate-400'>
            &copy; {currentYear} {t('footer.rights')}
          </p>

          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-900'>
              <CreditCard className='h-3.5 w-3.5 text-slate-400' />
              <select
                aria-label='Select Currency'
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className='cursor-pointer bg-transparent text-xs font-medium text-slate-700 outline-none dark:text-slate-200'
              >
                <option value='USD'>USD ($)</option>
                <option value='VND'>VND (₫)</option>
              </select>
            </div>

            <div className='flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-900'>
              <Globe className='h-3.5 w-3.5 text-slate-400' />
              <select
                aria-label='Select Language'
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className='cursor-pointer bg-transparent text-xs font-medium text-slate-700 outline-none dark:text-slate-200'
              >
                <option value='vi'>Tiếng Việt</option>
                <option value='en'>English</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
