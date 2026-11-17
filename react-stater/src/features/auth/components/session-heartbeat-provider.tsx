import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useSessionHeartbeat } from '../hooks/use-session-heartbeat';
import { registerSpaNavigator } from '@/lib/spa-navigation';

export function SessionHeartbeatProvider() {
  const router = useRouter();

  useEffect(() => {
    // Đăng ký bộ điều hướng SPA toàn cục với TanStack Router
    registerSpaNavigator((path) => {
      try {
        const [pathname, search] = path.split('?');
        const searchObj = search ? Object.fromEntries(new URLSearchParams(search)) : undefined;
        router.navigate({
          to: pathname as unknown as '/auth/sign-in',
          search: searchObj as unknown as Record<string, string>
        });
      } catch {
        if (typeof window !== 'undefined') {
          window.location.href = path;
        }
      }
    });

    return () => {
      registerSpaNavigator(null);
    };
  }, [router]);

  useSessionHeartbeat();

  return null;
}
