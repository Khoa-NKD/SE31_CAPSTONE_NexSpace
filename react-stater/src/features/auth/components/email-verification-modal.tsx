import React, { useState, useEffect, useTransition } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Mail, ArrowRight, CheckCircle2, RotateCw } from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { authService } from '../api/auth-service';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { subscribeAuthSync } from '../utils/auth-sync';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export function EmailVerificationModal({ isOpen, onClose, email }: EmailVerificationModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = useState('');
  const [isVerifying, startVerify] = useTransition();
  const [isResending, startResend] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerified, setIsVerified] = useState(false);

  // Subscribe to real-time sync & fallback polling
  useEffect(() => {
    if (!isOpen || isVerified) return;

    // 1. Zero-latency BroadcastChannel & Storage Event listener
    const unsubscribe = subscribeAuthSync((event) => {
      if (event.type === 'EMAIL_VERIFIED_SUCCESS') {
        setIsVerified(true);
        toast.success('Xác thực tài khoản thành công!');
      }
    });

    // 2. Cross-device fallback polling (e.g., user clicked on mobile)
    let isCancelled = false;
    const interval = setInterval(async () => {
      if (!email || isCancelled) return;
      try {
        const res = await authService.checkVerificationStatus(email);
        if (res.verified) {
          setIsVerified(true);
          toast.success('Xác thực tài khoản thành công!');
        }
      } catch {
        // Silently skip
      }
    }, 2500);

    return () => {
      isCancelled = true;
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen, email, isVerified]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

  const handleGoToSignIn = () => {
    onClose();
    navigate({ to: '/auth/sign-in' });
  };

  const handleVerifyDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;

    startVerify(async () => {
      try {
        await authService.verifyEmailDirect(token);
        toast.success('Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.');
        setIsVerified(true);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          toast.error(payload?.message || err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
        } else {
          toast.error('Không thể xác thực. Vui lòng kiểm tra lại mã.');
        }
      }
    });
  };

  const handleResend = () => {
    if (resendCooldown > 0 || isResending) return;

    startResend(async () => {
      try {
        await authService.resendVerification(email);
        toast.success(`Đã gửi lại email xác thực tới ${email}`);
        setResendCooldown(60);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          toast.error(payload?.message || err.message || 'Không thể gửi lại email.');
        } else {
          toast.error('Gửi lại email thất bại. Vui lòng thử lại sau.');
        }
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-[480px] p-8 sm:p-10 bg-white dark:bg-slate-900 border border-border-subtle dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden'>
        <DialogTitle className='sr-only'>{t('auth.verify.title')}</DialogTitle>
        <DialogDescription className='sr-only'>{t('auth.verify.subtitle')}</DialogDescription>

        {isVerified ? (
          <div className='flex flex-col items-center relative z-10 w-full py-4 text-center space-y-5'>
            {/* Animated Glow Checkmark */}
            <div className='relative w-20 h-20'>
              <div className='absolute inset-0 rounded-full bg-emerald-500/20 animate-ping' />
              <div className='relative w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg'>
                <CheckCircle2 className='w-10 h-10 stroke-[2.5]' />
              </div>
            </div>

            <div className='space-y-2'>
              <h1 className='text-2xl font-bold tracking-tight text-slate-900 dark:text-white'>
                Xác thực email thành công!
              </h1>
              <p className='text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto'>
                Tài khoản <span className='font-semibold text-slate-900 dark:text-white'>{email}</span> đã được kích hoạt thành công. Bạn không cần nhập token nữa và có thể đăng nhập ngay bây giờ.
              </p>
            </div>

            <button
              type='button'
              onClick={handleGoToSignIn}
              className='w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all outline-none focus:ring-4 focus:ring-indigo-600/25 cursor-pointer mt-2'
            >
              <span>Đăng nhập lại ngay</span>
              <ArrowRight className='w-4 h-4 stroke-[2.5]' />
            </button>
          </div>
        ) : (
          <div className='flex flex-col items-center relative z-10 w-full'>
            {/* Header Icon */}
            <div className='flex justify-center mb-2'>
              <div className='w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 ring-8 ring-indigo-50/50 dark:ring-indigo-900/20'>
                <Mail className='h-6 w-6 stroke-[1.5]' />
              </div>
            </div>

            {/* Headline & Instructions */}
            <h1 className='text-headline-md font-headline-md font-bold text-slate-900 dark:text-white text-center mt-5 text-[24px] tracking-tight'>
              Xác thực tài khoản của bạn
            </h1>
            <p className='text-body-base font-body-base text-slate-600 dark:text-slate-300 text-center mt-2.5 leading-relaxed'>
              Chúng tôi đã gửi link kích hoạt đến email:
              <span className='block mt-1 font-semibold text-slate-900 dark:text-white break-all'>
                {email}
              </span>
            </p>

            {/* Live Synchronizing Pulse Banner */}
            <div className='mt-4 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed text-left w-full flex items-start gap-2.5'>
              <div className='w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse mt-0.5 shrink-0' />
              <div>
                <strong>Tự động đồng bộ:</strong> Khi bạn bấm nút <em>"Xác thực email"</em> trong hòm thư Gmail, màn hình này sẽ tự động chuyển sang trạng thái thành công mà không cần dán mã.
              </div>
            </div>

            {/* Direct Token Verification Form */}
            <form className='mt-5 w-full space-y-4' onSubmit={handleVerifyDirect}>
              <div>
                <label
                  htmlFor='tokenInput'
                  className='block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5'
                >
                  Mã xác thực thủ công (Token dự phòng):
                </label>
                <input
                  id='tokenInput'
                  type='text'
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder='Dán mã token hoặc UUID vào đây...'
                  className='w-full h-11 px-3.5 bg-surface-card dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600'
                />
              </div>

              <button
                type='submit'
                disabled={!tokenInput.trim() || isVerifying}
                className={cn(
                  'w-full h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-label-base text-[14px] font-semibold rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer',
                  isVerifying && 'opacity-70 cursor-wait'
                )}
              >
                {isVerifying ? (
                  <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                ) : (
                  <>
                    <CheckCircle2 className='h-4 w-4 stroke-[2]' />
                    <span>Xác thực ngay</span>
                  </>
                )}
              </button>
            </form>

            {/* Secondary Resend Trigger */}
            <div className='mt-6 text-center w-full'>
              <p className='text-body-sm font-body-sm text-slate-600 dark:text-slate-400'>
                Chưa nhận được email?
                <button
                  type='button'
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isResending}
                  className='text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold disabled:cursor-not-allowed disabled:opacity-60 ml-2 inline-flex items-center gap-1 transition-colors cursor-pointer'
                >
                  {isResending && <RotateCw className='w-3 h-3 animate-spin' />}
                  <span>
                    {resendCooldown > 0 ? `Gửi lại sau (${resendCooldown}s)` : 'Gửi lại email'}
                  </span>
                </button>
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EmailVerificationModal;
