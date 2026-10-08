import { Link, useNavigate } from '@tanstack/react-router';
import { NexSpaceLogo } from '@/components/brand/logo';
import { HelpCircle, Mail, ArrowRight, Lock } from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import React, { useState } from 'react';

export default function EmailVerificationView() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.length === 6) {
      // simulate success
      navigate({ to: '/dashboard/overview' });
    }
  };

  return (
    <div className='bg-surface-app text-on-surface antialiased min-h-screen flex flex-col justify-between selection:bg-indigo-subtle selection:text-secondary'>
      {/* Top Minimal Focused Navigation */}
      <header className='w-full bg-surface-card/90 backdrop-blur-md border-b border-border-subtle sticky top-0 z-50'>
        <div className='w-full h-[72px] px-6 lg:px-12 flex items-center justify-between max-w-[1440px] mx-auto'>
          {/* Logo Branding & Platform Moniker */}
          <div className='flex items-center gap-4'>
            <Link to='/' className='flex items-center outline-none transition-transform active:scale-95 cursor-pointer'>
              <NexSpaceLogo variant='horizontal' className='h-9 w-auto' />
            </Link>
            <div className='h-4 w-px bg-border-interactive/60 hidden sm:block'></div>
            <span className='text-label-sm font-label-sm text-on-surface-variant hidden sm:inline-block'>
              {t('auth.verify.platform')}
            </span>
          </div>
          {/* Contextual Support Action */}
          <div className='flex items-center gap-4'>
            <button
              type='button'
              className='inline-flex items-center gap-1.5 text-label-base font-label-base text-on-surface-variant hover:text-secondary transition-colors cursor-pointer outline-none'
            >
              <HelpCircle className='h-[18px] w-[18px]' />
              <span>{t('auth.verify.support')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main 
        className='flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden'
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.28) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        {/* Ambient architectural glow background accent */}
        <div className='absolute w-[560px] h-[560px] bg-secondary-fixed/30 rounded-full blur-3xl pointer-events-none -top-24 -left-20'></div>
        <div className='absolute w-[480px] h-[480px] bg-indigo-subtle/50 rounded-full blur-3xl pointer-events-none -bottom-24 -right-16'></div>
        
        <div className='w-full max-w-[400px] flex flex-col items-center relative z-10'>
          {/* Primary Card Container */}
          <div className='w-full bg-surface-card rounded-xl border border-border-subtle p-8 shadow-[0_1px_3px_0_rgba(15,23,42,0.05),0_1px_2px_-1px_rgba(15,23,42,0.03)]'>
            {/* Header Icon */}
            <div className='flex justify-center'>
              <div className='w-12 h-12 rounded-full bg-indigo-subtle flex items-center justify-center text-secondary ring-8 ring-indigo-subtle/40'>
                <Mail className='h-6 w-6' />
              </div>
            </div>
            {/* Headline & Instructions */}
            <h1 className='text-headline-md font-headline-md font-bold text-on-surface text-center mt-5 text-[22px] leading-7'>
              {t('auth.verify.title')}
            </h1>
            <p className='text-body-base font-body-base text-on-surface-variant text-center mt-2 leading-relaxed'>
              {t('auth.verify.subtitle')}
              <span className='block mt-1 font-semibold text-on-surface'>
                khoa.dang@example.com
                <Link
                  to='/auth/sign-up'
                  className='ml-1 text-secondary hover:text-indigo-dark font-medium underline inline-block transition-colors text-body-sm font-body-sm focus:outline-none focus:ring-1 focus:ring-secondary rounded px-0.5 cursor-pointer'
                >
                  {t('auth.verify.changeEmail')}
                </Link>
              </span>
            </p>

            {/* Form Context */}
            <form className='mt-6' onSubmit={onSubmit}>
              {/* OTP Input Component */}
              <div className='flex justify-center mb-6'>
                <InputOTP
                  maxLength={6}
                  value={value}
                  onChange={(val) => setValue(val)}
                  containerClassName='gap-2'
                >
                  <InputOTPGroup className='gap-2 flex'>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className='w-12 h-[52px] rounded-lg border border-border-subtle bg-surface-card text-center font-mono font-bold text-2xl text-on-surface shadow-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all caret-secondary first:rounded-lg first:border-l last:rounded-lg aria-invalid:border-status-danger aria-invalid:ring-status-danger/20 data-[active=true]:border-secondary data-[active=true]:ring-secondary/20 data-[active=true]:ring-[3px]'
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Expiry Timer Pill Badge */}
              <div className='flex justify-center mb-6'>
                <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-warning-subtle border border-status-warning/30 text-status-warning text-caption-code font-caption-code'>
                  <span className='w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse'></span>
                  <span className='text-[#92400E] font-medium tracking-normal text-[12px]'>
                    {t('auth.verify.expiresIn')} <span className='font-mono font-semibold'>04:59</span>
                  </span>
                </div>
              </div>

              {/* Primary CTA Button */}
              <button
                type='submit'
                disabled={value.length < 6}
                className='w-full h-11 bg-secondary hover:bg-indigo-dark disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-secondary text-on-primary font-label-base text-label-base font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:ring-offset-2 cursor-pointer'
              >
                <span>{t('auth.verify.btn')}</span>
                <ArrowRight className='h-[18px] w-[18px]' />
              </button>
            </form>

            {/* Secondary Resend Trigger */}
            <div className='mt-5 text-center'>
              <p className='text-body-sm font-body-sm text-outline'>
                {t('auth.verify.didNotReceive')}
                <button
                  type='button'
                  disabled
                  className='text-outline cursor-not-allowed font-medium ml-1 inline-flex items-center gap-1'
                >
                  <span>{t('auth.verify.resend')} (30s)</span>
                </button>
              </p>
            </div>
          </div>

          {/* Trust & Security Signals */}
          <div className='mt-6 flex items-center justify-center gap-2 text-label-sm font-label-sm text-outline'>
            <Lock className='h-4 w-4 text-on-surface-variant' />
            <span>{t('auth.verify.trust')}</span>
          </div>
        </div>
      </main>

      {/* Global Directorial Footer */}
      <footer className='w-full bg-surface-card border-t border-border-subtle py-6 px-6 lg:px-12'>
        <div className='max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left'>
          <p className='text-body-sm font-body-sm text-on-surface-variant'>
            © 2025 NexSpace Technologies Inc. All rights reserved. Commercial Real Estate Cloud & Marketplace.
          </p>
          <div className='flex items-center gap-6 justify-center sm:justify-start'>
            <Link to='/' className='text-body-sm font-body-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer outline-none'>
              Privacy Notice
            </Link>
            <Link to='/' className='text-body-sm font-body-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer outline-none'>
              Terms of Service
            </Link>
            <button type='button' className='text-body-sm font-body-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer outline-none'>
              <span className='w-2 h-2 rounded-full bg-emerald-500'></span>
              <span>System Status</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
