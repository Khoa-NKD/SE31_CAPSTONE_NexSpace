import React, { useEffect, useSyncExternalStore } from 'react';
import { createFileRoute, Outlet, useLocation, useRouter, redirect } from '@tanstack/react-router';
import CommandMenu from '@/components/command-menu';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { checkRouteAccess } from '@/features/auth/utils/role-guard';
import { toast } from 'sonner';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { OrganizerOperationalBoundary } from '@/features/organizer-lifecycle/components/organizer-operational-boundary';

const emptySubscribe = () => () => {};

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ location }) => {
    // Only execute client-side to avoid blocking server-rendered hydration
    if (typeof window === 'undefined') return;
    const auth = useAuthStore.getState();
    const access = checkRouteAccess(location.pathname, auth.isAuthenticated, auth.user);
    if (!access.allowed && access.redirectUrl) {
      throw redirect({
        to: access.redirectUrl
      });
    }
  },
  head: () => ({
    meta: [
      { title: 'Dashboard | NexSpace' },
      {
        name: 'description',
        content: 'NexSpace unified operations, organizer portal, and customer workspace.'
      },
      { name: 'robots', content: 'noindex, nofollow' }
    ]
  }),
  component: DashboardLayout
});

function DashboardLayout() {
  const { pathname } = useLocation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const access = checkRouteAccess(pathname, isAuthenticated, user);

  useEffect(() => {
    if (!mounted) return;
    if (!access.allowed && access.redirectUrl) {
      if (access.reason) {
        toast.error(access.reason);
      }
      router.navigate({ to: access.redirectUrl });
    }
  }, [mounted, access.allowed, access.redirectUrl, access.reason, router]);

  if (mounted && !access.allowed) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <div className='flex flex-col items-center gap-3 p-6 max-w-sm text-center'>
          <ShieldAlert className='size-10 text-destructive animate-pulse' />
          <h2 className='text-lg font-semibold text-foreground'>Access Restricted</h2>
          <p className='text-xs text-muted-foreground'>
            {access.reason || 'Redirecting to your authorized workspace...'}
          </p>
          <Loader2 className='size-5 animate-spin text-muted-foreground mt-2' />
        </div>
      </div>
    );
  }

  return (
    <CommandMenu>
      <SidebarProvider>
        <a
          href='#main-content'
          className='sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring'
        >
          Skip to content
        </a>
        <AppSidebar />
        <SidebarInset id='main-content' tabIndex={-1}>
          <Header />
          <InfobarProvider defaultOpen={false}>
            <OrganizerOperationalBoundary>
              <Outlet />
            </OrganizerOperationalBoundary>
            <InfoSidebar side='right' />
          </InfobarProvider>
        </SidebarInset>
      </SidebarProvider>
    </CommandMenu>
  );
}
