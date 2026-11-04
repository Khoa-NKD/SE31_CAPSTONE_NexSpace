import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Mail, ArrowRight, CheckCircle2, RotateCw } from 'lucide-react';
import { useLanguage } from '../../landing/context/language-context';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { authService } from '../api/auth-service';
import { ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { broadcastAuthSync, subscribeAuthSync } from '../utils/auth-sync';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  initialVerified?: boolean;
}

export function EmailVerificationModal({
  isOpen,
  onClose,
  email,
  initialVerified = false
}: EmailVerificationModalProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isResending, startResend] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [countdown, setCountdown] = useState(3);

  const effectiveVerified = isVerified || initialVerified;

  const handleGoToSignIn = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexspace_pending_verification_email');
    }
    onClose();
    navigate({ to: '/auth/sign-in' });
  }, [onClose, navigate]);

  // Subscribe to real-time sync & fallback polling
  useEffect(() => {
    if (!isOpen || effectiveVerified) return;

    // 1. Zero-latency BroadcastChannel & Storage Event listener
    const unsubscribe = subscribeAuthSync((event) => {
      if (event.type === 'CHECK_EXISTING_SIGNUP_TAB') {
        broadcastAuthSync({ type: 'SIGNUP_TAB_ALREADY_ACTIVE' });
      }
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
    }, 2000);

    return () => {
      isCancelled = true;
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOpen, email, effectiveVerified]);

  // Auto-redirect to sign-in countdown when verified
  useEffect(() => {
    if (!effectiveVerified) return;
    if (countdown <= 0) {
      handleGoToSignIn();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [effectiveVerified, countdown, handleGoToSignIn]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, resendCooldown]);

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

        {effectiveVerified ? (
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
                Tài khoản <span className='font-semibold text-slate-900 dark:text-white'>{email}</span> đã được kích hoạt thành công.
              </p>
              <p className='text-xs font-medium text-indigo-600 dark:text-indigo-400 animate-pulse'>
                Tự động chuyển hướng về trang Đăng nhập sau {countdown}s...
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

            {/* Live Listening & Action Pulse Banner */}
            <div className='mt-5 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed text-left w-full space-y-2'>
              <div className='flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold'>
                <div className='w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-ping shrink-0' />
                <span>Đang chờ bạn mở liên kết từ email...</span>
              </div>
              <p className='text-slate-600 dark:text-slate-300'>
                Vui lòng mở hộp thư Gmail và nhấn nút <strong>"Xác thực email"</strong>. Màn hình này sẽ tự động nhận diện và hoàn tất kích hoạt mà không cần nhập bất kỳ mã token nào.
              </p>
            </div>

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
