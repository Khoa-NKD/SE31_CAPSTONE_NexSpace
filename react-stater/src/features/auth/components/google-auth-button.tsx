import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../../landing/context/language-context';
import { authService } from '../api/auth-service';
import { useAuthStore } from '../store/auth-store';
import { getRoleHomeUrl, getSignInReturnPath } from '../utils/role-guard';
import { EmailVerificationModal } from './email-verification-modal';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
    <path
      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
      fill='#4285F4'
    />
    <path
      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      fill='#34A853'
    />
    <path
      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
      fill='#FBBC05'
    />
    <path
      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      fill='#EA4335'
    />
  </svg>
);

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => GoogleTokenClient;
        };
        id?: {
          initialize: (config: unknown) => void;
          prompt: (notification?: unknown) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onRequireVerification?: (email: string) => void;
  className?: string;
}

export default function GoogleSignInButton({
  onSuccess,
  onRequireVerification,
  className
}: GoogleSignInButtonProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const tokenClientRef = useRef<GoogleTokenClient | null>(null);

  const clientId =
    (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string) ||
    '1058463793525-sl12vgaft67vq8br580jpkgnj0u74b0r.apps.googleusercontent.com';

  const handleGoogleCredential = useCallback(
    async (token: string) => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      try {
        const response = await authService.loginWithGoogle(token);

        if (response.requiresVerification) {
          // ── NHÁNH 1: Tài khoản mới chưa dùng -> yêu cầu xác thực email ──
          setVerificationEmail(response.email);
          onRequireVerification?.(response.email);
          toast.info(
            response.message ||
              'Chúng tôi đã gửi email xác thực đến Gmail của bạn. Vui lòng kiểm tra hộp thư để xác thực trước khi đăng nhập.'
          );
        } else if (response.accessToken && response.user) {
          // ── NHÁNH 2: Tài khoản đã có trên hệ thống -> Đăng nhập thành công ngay ──
          useAuthStore.getState().setAuth({
            user: response.user,
            accessToken: response.accessToken
          });

          toast.success(
            `Đăng nhập Google thành công! Chào mừng ${response.user.fullName || response.user.firstName || response.user.userName}`
          );

          if (onSuccess) {
            onSuccess();
          } else {
            const target =
              typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('redirect') ||
                  sessionStorage.getItem('nexspace_auth_redirect')
                : null;
            const returnPath = getSignInReturnPath(target, response.user);
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('nexspace_auth_redirect');
            }
            if (returnPath) {
              window.location.replace(returnPath);
            } else {
              router.navigate({ to: getRoleHomeUrl(response.user) });
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const payload = err.data as { message?: string } | null;
          const msg = payload?.message || err.message || 'Đăng nhập Google không thành công';
          toast.error(msg);
        } else {
          toast.error('Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onRequireVerification, onSuccess, router]
  );

  // Initialize Google Identity Services OAuth2 Client
  useEffect(() => {
    let isSubscribed = true;

    const setupTokenClient = () => {
      if (!isSubscribed || typeof window === 'undefined') return;

      if (window.google?.accounts?.oauth2) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'email profile openid',
            callback: (res) => {
              if (res?.access_token) {
                handleGoogleCredential(res.access_token);
              } else {
                setIsLoading(false);
              }
            }
          });
        } catch (e) {
          console.warn('Failed to initialize Google Token Client', e);
        }
      }
    };

    if (window.google?.accounts?.oauth2) {
      setupTokenClient();
      return;
    }

    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', setupTokenClient);
      return () => {
        isSubscribed = false;
        existingScript.removeEventListener('load', setupTokenClient);
      };
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => setupTokenClient(), { once: true });
    script.addEventListener(
      'error',
      () => {
        console.warn('Failed to load Google Identity Services library');
      },
      { once: true }
    );
    document.head.appendChild(script);

    return () => {
      isSubscribed = false;
    };
  }, [clientId, handleGoogleCredential]);

  const handleGoogleSignInClick = () => {
    if (isLoading) return;

    if (tokenClientRef.current) {
      setIsLoading(true);
      try {
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
      } catch {
        setIsLoading(false);
        toast.error('Không thể khởi tạo popup Google. Vui lòng kiểm tra chặn popup trình duyệt.');
      }
    } else if (window.google?.accounts?.oauth2) {
      setIsLoading(true);
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          callback: (res) => {
            if (res?.access_token) {
              handleGoogleCredential(res.access_token);
            } else {
              setIsLoading(false);
            }
          }
        });
        tokenClientRef.current = client;
        client.requestAccessToken({ prompt: 'select_account' });
      } catch {
        setIsLoading(false);
        toast.error('Lỗi khởi động đăng nhập Google.');
      }
    } else {
      toast.info('Đang kết nối tới máy chủ Google, vui lòng thử lại sau 1-2 giây...');
    }
  };

  return (
    <>
      <button
        type='button'
        disabled={isLoading}
        onClick={handleGoogleSignInClick}
        aria-label='Tiếp tục với Google'
        className={cn(
          'w-full h-11 px-4 rounded-lg font-medium text-sm border flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer select-none outline-none shadow-sm hover:shadow active:scale-[0.99]',
          'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border-slate-300',
          'dark:bg-slate-900 dark:hover:bg-slate-800 dark:active:bg-slate-750 dark:text-slate-100 dark:border-slate-800',
          'focus-visible:ring-2 focus-visible:ring-indigo-600/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950',
          isLoading && 'opacity-70 cursor-not-allowed active:scale-100',
          className
        )}
      >
        {isLoading ? (
          <Loader2 className='w-4.5 h-4.5 animate-spin text-indigo-600 dark:text-indigo-400' />
        ) : (
          <GoogleIcon className='w-5 h-5 flex-shrink-0' />
        )}
        <span className='font-semibold'>
          {isLoading
            ? language === 'vi'
              ? 'Đang kết nối Google...'
              : 'Connecting to Google...'
            : language === 'vi'
              ? 'Tiếp tục với Google'
              : 'Continue with Google'}
        </span>
      </button>

      {/* Auto-managed Email Verification Modal for New Google Accounts */}
      <EmailVerificationModal
        isOpen={Boolean(verificationEmail)}
        onClose={() => setVerificationEmail(null)}
        email={verificationEmail || ''}
      />
    </>
  );
}
