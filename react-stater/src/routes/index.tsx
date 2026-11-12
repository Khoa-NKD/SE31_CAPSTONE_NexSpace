import React, { useEffect } from 'react';
import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router';
import { seo } from '@/lib/seo';
import LandingPage from '@/features/landing/components/landing-page';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';

export const Route = createFileRoute('/')({
  beforeLoad: ({ search }) => {
    if (typeof window === 'undefined') return;
    const auth = useAuthStore.getState();
    const role = getUserRole(auth.user);
    const viewParam = (search as { view?: string })?.view;
    if (viewParam === 'customer') {
      auth.setAdminViewMode?.('customer');
      return;
    }
    // Nếu là ADMIN và không chủ động chọn xem chế độ Customer, tự động chuyển vào trang Admin
    if (auth.isAuthenticated && role === 'ADMIN' && auth.adminViewMode !== 'customer') {
      throw redirect({ to: '/dashboard/overview' });
    }
  },
  head: () => ({
    meta: seo({
      title: 'NexSpace — Beyond Flexible Office Space | Workplace Cloud & Marketplace',
      description:
        'Access on-demand workspace, manage hybrid teams, and continuously optimize your workplace strategy—all on one unified platform.',
      path: '/'
    })
  }),
  component: IndexPage
});

function IndexPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const adminViewMode = useAuthStore((state) => state.adminViewMode);
  const role = getUserRole(user);

  useEffect(() => {
    // Client-side hydration safety check
    if (isAuthenticated && role === 'ADMIN' && adminViewMode !== 'customer') {
      navigate({ to: '/dashboard/overview' });
    }
  }, [isAuthenticated, role, adminViewMode, navigate]);

  return <LandingPage />;
}
