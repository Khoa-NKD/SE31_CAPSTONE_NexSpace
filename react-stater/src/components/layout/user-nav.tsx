import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { authService } from '@/features/auth/api/auth-service';
import { useRouter } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Settings, LayoutDashboard, LogOut, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { applicationStatusQueryOptions } from '@/features/organizer-application-status/api/status';

export function UserNav() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const role = getUserRole(user);
  const token = useAuthStore((state) => state.accessToken);
  const [open, setOpen] = useState(false);
  const canReadApplication = !!user && !!token && ['USER', 'ORGANIZER'].includes(role);
  const application = useQuery({
    ...applicationStatusQueryOptions(user?.id ?? 0),
    // Check on opening the menu so a newly created draft is discoverable without a page reload.
    enabled: open && canReadApplication,
    refetchOnWindowFocus: false
  });
  const showApplicationStatus =
    canReadApplication && application.isSuccess && !!application.data && !application.isFetching;

  const handleSignOut = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuth();
      toast.success('Đã đăng xuất thành công');
      router.navigate({ to: '/auth/sign-in' });
    }
  };

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName
    : 'User';
  const displayEmail = user?.email || 'user@example.com';
  const initial = (user?.firstName?.[0] || user?.userName?.[0] || 'U').toUpperCase();

  const handleDashboardClick = () => {
    if (role === 'ORGANIZER') {
      router.navigate({ to: '/dashboard/organizer/workspaces' });
    } else {
      router.navigate({ to: '/dashboard/overview' });
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={displayName} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' sideOffset={10}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>{displayName}</p>
              <p className='text-muted-foreground text-xs leading-none'>{displayEmail}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className='cursor-pointer flex items-center gap-2'
            onClick={handleDashboardClick}
          >
            <LayoutDashboard className='w-4 h-4 text-muted-foreground' />
            <span>Dashboard</span>
          </DropdownMenuItem>
          {showApplicationStatus && (
            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() =>
                router.navigate({
                  to: role === 'ORGANIZER' ? '/dashboard/organizer/application' : '/organizer/apply'
                })
              }
            >
              <ClipboardList className='w-4 h-4 text-muted-foreground' />
              <span>Quản lý hồ sơ Organizer</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className='cursor-pointer flex items-center gap-2'
            onClick={() => router.navigate({ to: '/dashboard/settings' })}
          >
            <Settings className='w-4 h-4 text-muted-foreground' />
            <span>Settings & Security</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className='text-red-600 dark:text-red-400 cursor-pointer flex items-center gap-2'
        >
          <LogOut className='w-4 h-4' />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserNav;
