import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Accessibility, CreditCard, Globe, Shield, ShieldCheck } from 'lucide-react';
import { NexSpaceLogo } from '@/components/brand/logo';
import {
  COMPLIANCE_BADGES,
  FOOTER_COLUMNS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES
} from '../constants/navigation';
import { useLanguage } from '../context/language-context';

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  Shield,
  Accessibility
};

export function Footer() {
  const { t } = useLanguage();
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [selectedLang, setSelectedLang] = useState('en');

  return (
    <footer className='relative border-t border-slate-800/80 bg-[#0a0f1d] text-slate-200 overflow-hidden'>
      {/* Top Horizon Gradient Guide */}
      <div className='pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent' />
      <div className='mx-auto grid max-w-[1440px] grid-cols-2 gap-8 px-6 py-16 md:grid-cols-5 lg:px-12'>
        {/* Col 1: Brand & Overview */}
        <div className='col-span-2 space-y-4 md:col-span-1'>
          <a href='/' className='inline-block'>
            <NexSpaceLogo inverted className='h-9 w-auto' />
          </a>
          <p className='text-xs leading-relaxed text-slate-400'>{t('footer.tagline')}</p>
          <p className='pt-2 text-[11px] leading-relaxed text-slate-400'>
            &copy; {new Date().getFullYear()} {t('footer.rights')}
          </p>
        </div>

        {/* Dynamic Nav Columns */}
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className='space-y-3'>
            <h4 className='text-sm font-semibold tracking-tight text-white'>{column.title}</h4>
            <ul className='space-y-2 text-xs'>
              {column.links.map((link) => {
                const isInternal = link.href.startsWith('/');
                return (
                  <li key={link.label}>
                    {isInternal ? (
                      <Link
                        to={link.href}
                        className='inline-block text-slate-400 transition-colors duration-150 hover:translate-x-0.5 hover:text-white'
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className='inline-block text-slate-400 transition-colors duration-150 hover:translate-x-0.5 hover:text-white'
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom Compliance & Pickers Sub-Bar */}
      <div className='border-t border-slate-800/80 bg-slate-950/40 py-6'>
        <div className='mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 text-xs text-slate-400 sm:flex-row lg:px-12'>
          {/* Compliance Badges */}
          <div className='flex flex-wrap items-center gap-4'>
            {COMPLIANCE_BADGES.map((badge) => {
              const Icon = BADGE_ICONS[badge.icon] || ShieldCheck;
              return (
                <span key={badge.label} className='flex items-center gap-1.5 text-slate-300'>
                  <Icon className='h-4 w-4 text-indigo-400' />
                  <span>{badge.label}</span>
                </span>
              );
            })}
          </div>

          {/* Currency & Locale Selectors */}
          <div className='flex items-center gap-3'>
            <div className='flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1'>
              <CreditCard className='h-3.5 w-3.5 text-slate-400' />
              <select
                aria-label='Select Currency'
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className='cursor-pointer bg-transparent text-xs text-slate-200 outline-none'
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code} className='bg-slate-900 text-white'>
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>

            <div className='flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1'>
              <Globe className='h-3.5 w-3.5 text-slate-400' />
              <select
                aria-label='Select Language'
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className='cursor-pointer bg-transparent text-xs text-slate-200 outline-none'
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className='bg-slate-900 text-white'>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
