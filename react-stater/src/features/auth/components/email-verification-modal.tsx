import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Mail, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

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
        className='max-w-[440px] p-8 bg-surface-card border-border-subtle rounded-2xl shadow-xl overflow-hidden'
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.28) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      >
        <DialogTitle className='sr-only'>{t('auth.verify.title')}</DialogTitle>
        <DialogDescription className='sr-only'>{t('auth.verify.subtitle')}</DialogDescription>

        <div className='flex flex-col items-center relative z-10 w-full'>
          {/* Header Icon */}
          <div className='flex justify-center'>
            <div className='w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-outline ring-8 ring-surface-muted/50'>
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
              {email}
              <button
                type='button'
                onClick={onClose}
                className='ml-1 text-outline hover:text-on-surface font-medium underline inline-block transition-colors text-body-sm font-body-sm focus:outline-none focus:ring-1 focus:ring-secondary rounded px-0.5 cursor-pointer'
              >
                {t('auth.verify.changeEmail')}
              </button>
            </span>
          </p>

          {/* Form Context */}
          <form className='mt-6 w-full' onSubmit={onSubmit}>
            {/* OTP Input Component */}
            <div className='flex justify-center mb-6 w-full'>
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
                      className='w-12 h-[52px] rounded-xl border border-border-interactive bg-surface-card text-center font-mono font-bold text-2xl text-on-surface shadow-sm focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all caret-secondary first:rounded-xl first:border-l last:rounded-xl aria-invalid:border-status-danger aria-invalid:ring-status-danger/20 data-[active=true]:border-secondary data-[active=true]:ring-secondary/20 data-[active=true]:ring-[3px]'
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Expiry Timer Pill Badge */}
            <div className='flex justify-center mb-6'>
              <div className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-interactive/60 bg-surface-card text-caption-code font-caption-code shadow-sm'>
                <span className='text-on-surface-variant font-medium tracking-normal text-[12px]'>
                  {t('auth.verify.expiresIn')} <span className='font-mono font-semibold text-[#92400E] ml-1'>04:59</span>
                </span>
              </div>
            </div>

            {/* Primary CTA Button */}
            <button
              type='submit'
              disabled={value.length < 6}
              className='w-full h-11 bg-surface-muted hover:bg-border-interactive disabled:opacity-50 disabled:cursor-not-allowed text-on-surface font-label-base text-label-base font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:ring-offset-2 cursor-pointer'
            >
              <span>{t('auth.verify.btn')}</span>
              <ArrowRight className='h-[18px] w-[18px]' />
            </button>
          </form>

          {/* Secondary Resend Trigger */}
          <div className='mt-6 text-center w-full'>
            <p className='text-body-sm font-body-sm text-on-surface'>
              {t('auth.verify.didNotReceive')}
              <button
                type='button'
                disabled
                className='text-on-surface font-semibold cursor-not-allowed ml-1 inline-flex items-center gap-1'
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
