import { createFileRoute, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';

/** Preserve old links while keeping unapproved applicants on the landing flow. */
export const Route = createFileRoute('/organizer/status')({
  beforeLoad: () => {
    if (typeof window === 'undefined') return;
    const role = getUserRole(useAuthStore.getState().user);
    throw redirect({
      to: role === 'ORGANIZER' ? '/dashboard/organizer/application' : '/organizer/apply',
      replace: true
    });
  },
  component: () => <p role='status'>Redirecting…</p>
});
