import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Mail, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function EmailVerificationModal({ isOpen, onClose, email }: EmailVerificationModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.length === 6) {
      // simulate success
      onClose();
      navigate({ to: '/dashboard/overview' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className='max-w-[440px] p-8 sm:p-10 bg-surface-card border-border-subtle rounded-3xl shadow-2xl overflow-hidden'
      >
        {/* Dynamic Dot Grid Background via Tailwind pseudo-element or standard CSS */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.08] dark:opacity-[0.12] pointer-events-none mix-blend-normal"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        />
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -left-20 w-[300px] h-[300px] bg-secondary/20 blur-[100px] rounded-full pointer-events-none z-0"></div>

        <DialogTitle className='sr-only'>{t('auth.verify.title')}</DialogTitle>
        <DialogDescription className='sr-only'>{t('auth.verify.subtitle')}</DialogDescription>

        <div className='flex flex-col items-center relative z-10 w-full'>
          {/* Header Icon - Premium Glass Variant */}
          <div className='flex justify-center mb-2'>
            <div className='w-14 h-14 rounded-full bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center text-secondary ring-8 ring-secondary/5 dark:ring-secondary/10'>
              <Mail className='h-6 w-6 stroke-[1.5]' />
            </div>
          </div>

          {/* Headline & Instructions */}
          <h1 className='text-headline-md font-headline-md font-bold text-on-surface text-center mt-5 text-[24px] tracking-tight'>
            {t('auth.verify.title')}
          </h1>
          <p className='text-body-base font-body-base text-on-surface-variant text-center mt-2.5 leading-relaxed'>
            {t('auth.verify.subtitle')}
            <span className='block mt-1 font-semibold text-on-surface'>
              {email}
              <button
                type='button'
                onClick={onClose}
                className='ml-1.5 text-secondary hover:text-indigo-dark font-medium underline underline-offset-2 inline-block transition-colors text-body-sm focus:outline-none rounded px-0.5 cursor-pointer'
              >
                {t('auth.verify.changeEmail')}
              </button>
            </span>
          </p>

          {/* Form Context */}
          <form className='mt-8 w-full' onSubmit={onSubmit}>
            {/* OTP Input Component */}
            <div className='flex justify-center mb-8 w-full'>
              <InputOTP
                maxLength={6}
                value={value}
                onChange={(val) => setValue(val)}
                containerClassName='gap-2 sm:gap-3'
              >
                <InputOTPGroup className='gap-2 sm:gap-3 flex'>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className={cn(
                        'w-[46px] h-[56px] sm:w-[50px] sm:h-[60px]',
                        'rounded-xl border border-border-interactive bg-surface-card text-center font-mono font-semibold text-2xl text-on-surface shadow-sm transition-all caret-secondary',
                        'first:rounded-xl first:border-l last:rounded-xl',
                        'focus:border-secondary focus:ring-4 focus:ring-secondary/20',
                        'data-[active=true]:border-secondary data-[active=true]:ring-4 data-[active=true]:ring-secondary/20 data-[active=true]:z-10 data-[active=true]:scale-[1.02]',
                        'aria-invalid:border-status-danger aria-invalid:ring-status-danger/20'
                      )}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Expiry Timer Pill Badge */}
            <div className='flex justify-center mb-8'>
              <div className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-status-warning/20 bg-status-warning/10 text-caption-code font-caption-code'>
                <span className='w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse'></span>
                <span className='text-status-warning font-medium tracking-normal text-[13px]'>
                  {t('auth.verify.expiresIn')} <span className='font-mono font-bold ml-1'>04:59</span>
                </span>
              </div>
            </div>

            {/* Primary CTA Button - Refactored to be prominent */}
            <button
              type='submit'
              disabled={value.length < 6}
              className='w-full h-12 bg-secondary hover:bg-indigo-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-label-base text-[15px] font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-secondary/40 cursor-pointer'
            >
              <span>{t('auth.verify.btn')}</span>
              <ArrowRight className='h-4 w-4 stroke-[2.5]' />
            </button>
          </form>

          {/* Secondary Resend Trigger */}
          <div className='mt-6 text-center w-full'>
            <p className='text-body-sm font-body-sm text-on-surface-variant'>
              {t('auth.verify.didNotReceive')}
              <button
                type='button'
                disabled
                className='text-on-surface font-semibold cursor-not-allowed ml-1 inline-flex items-center gap-1 transition-colors'
              >
                <span>{t('auth.verify.resend')} (30s)</span>
              </button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

