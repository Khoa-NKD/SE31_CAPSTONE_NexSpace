import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getRoleHomeUrl } from '@/features/auth/utils/role-guard';

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: () => {
    const auth = useAuthStore.getState();
    const targetUrl = getRoleHomeUrl(auth.user);
    throw redirect({ to: targetUrl });
  }
});
