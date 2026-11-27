import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import {
  User,
  SlidersHorizontal,
  Calendar,
  ClipboardList,
  Home,
  LayoutDashboard,
  Eye,
  Settings,
  LogOut,
  Building,
  Wallet,
  Store,
  BarChart3,
  ShieldAlert,
  Receipt
} from '@/components/ui/hugeicons';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { getUserRole } from '@/features/auth/utils/role-guard';
import { authService } from '@/features/auth/api/auth-service';
import { applicationStatusQueryOptions } from '@/features/organizer-application-status/api/status';
import { useLanguage } from '@/features/landing/context/language-context';

export function UserNav() {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const role = getUserRole(user);
  const token = useAuthStore((state) => state.accessToken);
  const [open, setOpen] = useState(false);

  const canReadApplication = !!user && !!token && role === 'USER';
  const application = useQuery({
    ...applicationStatusQueryOptions(user?.id ?? 0),
    enabled: open && canReadApplication,
    refetchOnWindowFocus: false
  });

  const handleSignOut = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuth();
      toast.success(isVi ? 'Đã đăng xuất thành công' : 'Signed out successfully');
      router.navigate({ to: '/auth/sign-in' });
    }
  };

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName
    : 'User';
  const displayEmail = user?.email || 'user@example.com';
  const initial = (
    user?.firstName?.[0] ||
    user?.lastName?.[0] ||
    user?.userName?.[0] ||
    user?.email?.[0] ||
    'U'
  ).toUpperCase();
  const avatarSrc = user?.avatar || user?.avatarUrl;

  const navigateTo = (to: string) => {
    setOpen(false);
    void router.navigate({ to });
  };

  const handleSwitchToCustomerView = () => {
    setOpen(false);
    useAuthStore.getState().setAdminViewMode('customer');
    void router.navigate({ to: '/', search: { view: 'customer' } });
  };

  const roleMeta = {
    ADMIN: {
      label: isVi ? 'Quản trị viên' : 'Administrator',
      badgeClass:
        'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
    },
    ORGANIZER: {
      label: isVi ? 'Đối tác không gian' : 'Organizer',
      badgeClass:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
    },
    USER: {
      label: isVi ? 'Khách hàng' : 'Customer',
      badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
    }
  }[role];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8 ring-1 ring-border'>
            {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} className='object-cover' />}
            <AvatarFallback className='bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 font-semibold select-none text-xs'>
              {initial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className='w-64' align='end' sideOffset={10}>
        {/* User Identity Header */}
        <DropdownMenuGroup>
          <DropdownMenuLabel
            className='font-normal cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors'
            onClick={() => navigateTo('/dashboard/settings')}
          >
            <div className='flex items-center gap-2.5'>
              <Avatar className='h-9 w-9 ring-1 ring-border shrink-0'>
                {avatarSrc && (
                  <AvatarImage src={avatarSrc} alt={displayName} className='object-cover' />
                )}
                <AvatarFallback className='bg-primary/10 text-primary font-semibold select-none text-xs'>
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-col space-y-1 min-w-0'>
                <p className='text-sm leading-none font-semibold truncate text-foreground'>
                  {displayName}
                </p>
                <p className='text-muted-foreground text-xs leading-none truncate'>{displayEmail}</p>
                <div className='pt-0.5'>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${roleMeta.badgeClass}`}
                  >
                    {roleMeta.label}
                  </span>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* ROLE A: ADMIN MENU */}
        {role === 'ADMIN' && (
          <DropdownMenuGroup>
            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2 font-medium text-foreground'
              onClick={() => navigateTo('/dashboard/overview')}
            >
              <LayoutDashboard className='w-4 h-4 text-purple-600 dark:text-purple-400' />
              <span>{isVi ? 'Bảng quản trị hệ thống' : 'Admin Dashboard'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/admin/organizers/queue')}
            >
              <Building className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Duyệt hồ sơ đối tác' : 'Partner Approvals'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/admin/bookings')}
            >
              <Calendar className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Sổ cái đặt chỗ toàn sàn' : 'Platform Bookings'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/admin/commissions')}
            >
              <Receipt className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Chính sách & Biểu phí' : 'Fee Structure & Rates'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/admin/payouts')}
            >
              <Wallet className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Chi trả & Quyết toán sàn' : 'Payouts & Settlements'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/admin/refunds')}
            >
              <ShieldAlert className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Xử lý hoàn tiền & khiếu nại' : 'Refunds & Claims'}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium'
              onClick={handleSwitchToCustomerView}
            >
              <Eye className='w-4 h-4 text-indigo-500' />
              <span>{isVi ? 'Xem giao diện Khách hàng' : 'Customer View Mode'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/')}
            >
              <Home className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Trang chủ (Landing)' : 'Home Landing'}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}

        {/* ROLE B: ORGANIZER MENU */}
        {role === 'ORGANIZER' && (
          <DropdownMenuGroup>
            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2 font-medium text-foreground'
              onClick={() => navigateTo('/dashboard/organizer/workspaces')}
            >
              <LayoutDashboard className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
              <span>{isVi ? 'Bảng điều khiển đối tác' : 'Organizer Console'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/organizer/workspaces')}
            >
              <Building className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Không gian của tôi' : 'My Workspaces'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/organizer/bookings')}
            >
              <Calendar className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Quản lý đặt chỗ' : 'Bookings Management'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/organizer/payouts')}
            >
              <Wallet className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Doanh thu & Chi trả' : 'Payouts & Balance'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/organizer/analytics')}
            >
              <BarChart3 className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Phân tích kinh doanh' : 'Business Analytics'}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/organizer/business-profile')}
            >
              <Store className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Thông tin doanh nghiệp' : 'Business Profile'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/organizer/application')}
            >
              <ClipboardList className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Hồ sơ đăng ký đối tác' : 'Partner Registration'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/')}
            >
              <Home className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Xem trang chủ (Khách hàng)' : 'Customer Marketplace'}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}

        {/* ROLE C: CUSTOMER (USER) MENU */}
        {role === 'USER' && (
          <DropdownMenuGroup>
            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2 font-medium text-foreground'
              onClick={() => navigateTo('/dashboard/settings')}
            >
              <User className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
              <span>{isVi ? 'Hồ sơ cá nhân' : 'My Profile'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/dashboard/preferences')}
            >
              <SlidersHorizontal className='w-4 h-4 text-indigo-600 dark:text-indigo-400' />
              <span>{isVi ? 'Sở thích không gian' : 'Space Preferences'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/workspaces/my-bookings')}
            >
              <Calendar className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Đơn đặt chỗ của tôi' : 'My Bookings'}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/workspaces/my-refunds')}
            >
              <ClipboardList className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Yêu cầu hoàn tiền' : 'My Refunds'}</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Application call-to-action for Customer */}
            {application.data ? (
              <DropdownMenuItem
                className='cursor-pointer flex items-center gap-2'
                onClick={() => navigateTo('/organizer/apply')}
              >
                <ClipboardList className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
                <span>{isVi ? 'Tiến trình hồ sơ đối tác' : 'Partner Application Status'}</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className='cursor-pointer flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium'
                onClick={() => navigateTo('/organizer/apply')}
              >
                <Store className='w-4 h-4 text-emerald-600 dark:text-emerald-400' />
                <span>{isVi ? 'Đăng ký trở thành Đối tác' : 'Become an Organizer'}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              className='cursor-pointer flex items-center gap-2'
              onClick={() => navigateTo('/')}
            >
              <Home className='w-4 h-4 text-muted-foreground' />
              <span>{isVi ? 'Trang chủ (Khám phá)' : 'Explore Spaces'}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}

        <DropdownMenuSeparator />

        {/* Global Account Settings & Sign Out */}
        <DropdownMenuGroup>
          <DropdownMenuItem
            className='cursor-pointer flex items-center gap-2'
            onClick={() => navigateTo('/dashboard/settings')}
          >
            <Settings className='w-4 h-4 text-muted-foreground' />
            <span>{isVi ? 'Cài đặt & Bảo mật' : 'Settings & Security'}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className='text-red-600 dark:text-red-400 cursor-pointer flex items-center gap-2 focus:text-red-600'
        >
          <LogOut className='w-4 h-4' />
          <span>{isVi ? 'Đăng xuất' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserNav;
