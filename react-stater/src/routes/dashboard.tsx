import React, { useEffect, useSyncExternalStore } from 'react';
import { createFileRoute, Outlet, useLocation, useRouter, redirect } from '@tanstack/react-router';
import CommandMenu from '@/components/command-menu';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { InfoSidebar } from '@/components/layout/info-sidebar';
import { InfobarProvider } from '@/components/ui/infobar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { checkRouteAccess, getUserRole } from '@/features/auth/utils/role-guard';
import { toast } from 'sonner';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getOrganizerOperationalStatus, organizerOperationalStatusKey } from '@/features/admin-organizers/api/partners';
import { WorkspaceHeader } from '@/features/workspaces/components/workspace-header';

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

  // Khách hàng (Customer) không có trang dashboard và không sử dụng thanh sidebar bên trái
  const role = getUserRole(user);
  if (role === 'USER') {
    return (
      <div className='min-h-screen flex flex-col bg-background'>
        <WorkspaceHeader />
        <main id='main-content' className='flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8'>
          <Outlet />
        </main>
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
          {mounted && user && getUserRole(user) === 'ORGANIZER' && pathname.startsWith('/dashboard/organizer') && (
            <OrganizerOperationalNotice userId={user.id} />
          )}
          <InfobarProvider defaultOpen={false}>
            <Outlet />
            <InfoSidebar side='right' />
          </InfobarProvider>
        </SidebarInset>
      </SidebarProvider>
    </CommandMenu>
  );
}

function OrganizerOperationalNotice({ userId }: { userId: number }) {
  const status = useQuery({
    queryKey: organizerOperationalStatusKey(userId),
    queryFn: ({ signal }) => getOrganizerOperationalStatus(signal),
    retry: false
  });
  if (!status.data?.suspended) return null;

  return (
    <Alert variant='destructive' className='mx-4 mt-4 w-auto sm:mx-7'>
      <ShieldAlert className='size-4' />
      <AlertTitle>Quyền hoạt động đối tác đang tạm ngưng</AlertTitle>
      <AlertDescription>
        <p>Bạn vẫn có thể xem hồ sơ và xử lý booking đã tạo. Các workspace tạm ngưng nhận đặt mới.</p>
        {status.data.reason && <p className='whitespace-pre-wrap break-words'>Lý do tạm ngưng · {status.data.reason}</p>}
      </AlertDescription>
    </Alert>
  );
}
