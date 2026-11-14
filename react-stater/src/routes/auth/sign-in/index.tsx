import { useEffect, useState } from 'react';
import { createFileRoute, useLocation } from '@tanstack/react-router';
import SignInViewPage from '@/features/auth/components/sign-in-view';
import { authService } from '@/features/auth/api/auth-service';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getSignInReturnPath } from '@/features/auth/utils/role-guard';
import { useLanguage } from '@/features/landing/context/language-context';
import { ApiError } from '@/lib/api-client';

export const Route = createFileRoute('/auth/sign-in/')({
  head: () => ({
    meta: [
      { title: 'Sign In | NexSpace' },
      { name: 'description', content: 'Sign in to manage your spaces, reservations, and teams.' }
    ]
  }),
  component: SignInPage
});

function SignInPage() {
  const search = useLocation({ select: (location) => location.searchStr });
  return <SignInReturn key={search} target={new URLSearchParams(search).get('redirect')} />;
}

function SignInReturn({ target }: { target: string | null }) {
  const [checking, setChecking] = useState(Boolean(target));
  const { language } = useLanguage();

  useEffect(() => {
    if (!target) return;
    const { accessToken } = useAuthStore.getState();
    const request = new AbortController();
    const sessionCheck = accessToken ? authService.getMe(request.signal) : Promise.resolve(null);
    void sessionCheck.then((user) => {
      if (request.signal.aborted) return;
      const session = useAuthStore.getState();
      if (user && session.accessToken === accessToken) {
        session.setUser(user);
        const returnPath = getSignInReturnPath(target, user);
        if (returnPath) {
          window.location.replace(returnPath);
          return;
        }
      }
      setChecking(false);
    }).catch((error: unknown) => {
      if (request.signal.aborted) return;
      const session = useAuthStore.getState();
      if (session.accessToken === accessToken && error instanceof ApiError && error.status === 401) {
        session.clearAuth();
      }
      setChecking(false);
    });
    return () => request.abort();
  }, [target]);

  if (checking) {
    return (
      <div role='status' className='grid min-h-screen place-items-center text-sm text-muted-foreground'>
        {language === 'vi' ? 'Đang kiểm tra phiên đăng nhập…' : 'Checking your session…'}
      </div>
    );
  }
  return <SignInViewPage />;
}
