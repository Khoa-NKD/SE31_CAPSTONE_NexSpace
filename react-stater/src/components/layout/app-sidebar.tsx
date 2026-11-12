import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { navGroups, customerNavGroups, organizerExtendedNavGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { authService } from '@/features/auth/api/auth-service';
import { getUserRole, getRoleHomeUrl } from '@/features/auth/utils/role-guard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from '@tanstack/react-router';
import { useLocation, useRouter } from '@tanstack/react-router';
import * as React from 'react';
import { Icons } from '../icons';
import { NexSpaceLogo } from '@/components/brand/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail
} from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { useLanguage } from '@/features/landing/context/language-context';

const organizerMenuVietnamese: Record<string, string> = {
  'Organizer Console': 'Quản lý đối tác',
  'User Space & Tools': 'Tiện ích & công cụ',
  'Application Management': 'Quản lý hồ sơ đăng ký',
  'Business Profile': 'Thông tin doanh nghiệp',
  'My Workspaces': 'Không gian của tôi',
  Buildings: 'Quản lý tòa nhà',
  'Floor Plan & Zones': 'Sơ đồ tầng & khu vực',
  'Seats & Rooms': 'Quản lý ghế & phòng',
  'Create Seat/Room': 'Tạo ghế/phòng',
  'Pricing Matrix': 'Bảng giá',
  'Blockout Hours': 'Lịch ngừng nhận đặt',
  Bookings: 'Quản lý đặt chỗ',
  'Schedule (Gantt)': 'Lịch biểu (Gantt)',
  Analytics: 'Phân tích',
  Overview: 'Tổng quan',
  Chat: 'Trò chuyện',
  Kanban: 'Bảng công việc'
};

export default function AppSidebar() {
  const { language } = useLanguage();
  const { pathname } = useLocation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const userRole = getUserRole(user);
  const isOrganizer = userRole === 'ORGANIZER';
  const isAdmin = userRole === 'ADMIN';

  const userAvatar = user?.avatar || user?.avatarUrl;
  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName
    : 'User';
  const initial = (user?.firstName?.[0] || user?.lastName?.[0] || user?.userName?.[0] || 'U').toUpperCase();
  const displayRole = isAdmin
    ? 'CPTO • Super Admin'
    : isOrganizer
      ? (language === 'vi' ? 'Đối tác đã xác minh' : 'Verified Partner')
      : (language === 'vi' ? 'Khách hàng' : 'Customer');

  const activeNavGroups = React.useMemo(() => {
    if (isAdmin) {
      return navGroups;
    }
    if (isOrganizer) {
      return organizerExtendedNavGroups;
    }
    return customerNavGroups;
  }, [isAdmin, isOrganizer]);

  const filteredGroups = useFilteredNavGroups(activeNavGroups).map((group) => ({
    ...group,
    label:
      isOrganizer && language === 'vi'
        ? (organizerMenuVietnamese[group.label ?? ''] ?? group.label)
        : group.label,
    items: group.items.map((item) => ({
      ...item,
      title:
        isOrganizer && language === 'vi'
          ? (organizerMenuVietnamese[item.title] ?? item.title)
          : item.title,
      label:
        isOrganizer && language === 'vi' && item.label === 'Planned' ? 'Sắp ra mắt' : item.label
    }))
  }));
  const [incidentModalOpen, setIncidentModalOpen] = React.useState(false);

  const handleIncidentSubmit = () => {
    setIncidentModalOpen(false);
    toast.error('Incident Escalated (Simulated)', {
      description: 'Incident report dispatched to on-call platform engineers in AP-Southeast-1.'
    });
  };

  return (
    <>
      <Sidebar
        variant='inset'
        collapsible='icon'
        className='bg-sidebar text-sidebar-foreground border-r border-sidebar-border'
      >
        <SidebarHeader className='bg-sidebar border-b border-sidebar-border pb-3'>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size='lg' asChild className='hover:bg-sidebar-accent'>
                <Link
                  to={getRoleHomeUrl(user)}
                  aria-label={
                    isOrganizer
                      ? 'NexSpace Organizer Hub'
                      : isAdmin
                        ? 'Nex Space Admin Console'
                        : 'NexSpace Home'
                  }
                >
                  <div className='flex items-center gap-2'>
                    <NexSpaceLogo
                      variant={isOrganizer ? 'organizer' : 'admin'}
                      aria-hidden='true'
                      className='h-8 w-auto group-data-[collapsible=icon]:hidden'
                    />
                    <NexSpaceLogo
                      variant='mark'
                      aria-hidden='true'
                      className='size-7 hidden group-data-[collapsible=icon]:block mx-auto'
                    />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Quick Incident CTA Button (Admin Only) */}
          {isAdmin && (
            <div className='px-2 pt-2'>
              <button
                type='button'
                onClick={() => setIncidentModalOpen(true)}
                className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-sidebar-accent/80 hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground rounded-lg border border-sidebar-border transition-colors text-xs font-medium group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:mx-auto'
                title='System Incident Report'
              >
                <Icons.warning className='size-3.5 text-amber-400 shrink-0' />
                <span className='truncate group-data-[collapsible=icon]:hidden'>
                  System Incident Report
                </span>
              </button>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className='overflow-x-hidden bg-sidebar [scrollbar-color:var(--sidebar-border)_transparent]'>
          {filteredGroups.map((group) => (
            <SidebarGroup key={group.label || 'ungrouped'} className='py-1.5'>
              {group.label && (
                <SidebarGroupLabel className='text-[10px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-3 group-data-[collapsible=icon]:hidden'>
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon ? Icons[item.icon] : Icons.logo;

                  if (item?.items && item?.items?.length > 0) {
                    return (
                      <Collapsible key={item.title} defaultOpen={item.isActive} asChild>
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              isActive={pathname === item.url}
                              className='group/collapsible hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground'
                            >
                              {item.icon && <Icon className='size-4 shrink-0' />}
                              <span className='group-data-[collapsible=icon]:hidden'>
                                {item.title}
                              </span>
                              <Icons.chevronRight className='ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden' />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className='border-sidebar-border'>
                              {item.items?.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={pathname === subItem.url}
                                    className='hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-accent-foreground'
                                  >
                                    <Link to={subItem.url} aria-label={subItem.title}>
                                      <span>{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  if (item.disabled) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          tooltip={`${item.title} (${item.label || 'Planned'})`}
                          isActive={false}
                          className='cursor-not-allowed opacity-60 text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/60 aria-disabled:pointer-events-none'
                          aria-disabled='true'
                        >
                          {item.icon && (
                            <Icon className='size-4 shrink-0 text-sidebar-foreground/60' />
                          )}
                          <span className='truncate flex-1 group-data-[collapsible=icon]:hidden'>
                            {item.title}
                          </span>
                          {item.label === '20' ? (
                            <span className='ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 group-data-[collapsible=icon]:hidden'>
                              20
                            </span>
                          ) : (
                            <span className='ml-auto text-[9px] uppercase px-1.5 py-0.5 font-semibold bg-sidebar-accent text-sidebar-foreground/60 rounded border border-sidebar-border group-data-[collapsible=icon]:hidden'>
                              {item.label || 'Planned'}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={pathname === item.url}
                        className='hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-l-2 data-[active=true]:border-sidebar-primary'
                      >
                        <Link to={item.url} aria-label={item.title}>
                          {item.icon && <Icon className='size-4 shrink-0' />}
                          <span className='truncate group-data-[collapsible=icon]:hidden'>
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className='bg-sidebar border-t border-sidebar-border p-2'>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size='lg'
                    className='hover:bg-sidebar-accent text-sidebar-foreground data-[state=open]:bg-sidebar-accent'
                  >
                    <div className='relative size-8 rounded-full shrink-0'>
                      <Avatar className='size-8 rounded-full border border-sidebar-border'>
                        {userAvatar && (
                          <AvatarImage src={userAvatar} alt={displayName} className='object-cover' />
                        )}
                        <AvatarFallback className='bg-sidebar-accent text-sidebar-foreground text-xs font-semibold select-none'>
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      {isOrganizer && (
                        <span className='absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-500 rounded-full border-2 border-sidebar flex items-center justify-center text-white text-[8px] leading-none'>
                          ✓
                        </span>
                      )}
                    </div>
                    <div className='grid flex-1 text-left text-xs leading-tight min-w-0 group-data-[collapsible=icon]:hidden'>
                      <span className='truncate font-semibold text-sidebar-foreground'>
                        {displayName}
                      </span>
                      <span className='text-sidebar-foreground/60 truncate text-[10px]'>
                        {displayRole}
                      </span>
                    </div>
                    <Icons.chevronsDown className='ml-auto size-3.5 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden' />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-sidebar text-sidebar-foreground border-sidebar-border'
                  side='bottom'
                  align='end'
                  sideOffset={4}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className='hover:bg-sidebar-accent focus:bg-sidebar-accent text-sidebar-foreground focus:text-sidebar-accent-foreground cursor-pointer'
                      onClick={() => router.navigate({ to: '/dashboard/settings' })}
                    >
                      <Icons.user className='mr-2 h-4 w-4 text-indigo-600' />
                      {language === 'vi' ? 'Hồ sơ cá nhân' : 'Profile Settings'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className='hover:bg-sidebar-accent focus:bg-sidebar-accent text-sidebar-foreground focus:text-sidebar-accent-foreground cursor-pointer'
                      onClick={() => router.navigate({ to: '/dashboard/notifications' })}
                    >
                      <Icons.notification className='mr-2 h-4 w-4' />
                      {language === 'vi' ? 'Thông báo' : 'Notifications'}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className='bg-sidebar-accent' />
                  <DropdownMenuItem
                    className='hover:bg-sidebar-accent focus:bg-sidebar-accent text-destructive focus:text-destructive cursor-pointer'
                    onClick={async () => {
                      try {
                        await authService.logout();
                      } catch {
                        // ignore network errors
                      }
                      useAuthStore.getState().clearAuth();
                      toast.success(language === 'vi' ? 'Đã đăng xuất thành công' : 'Signed out successfully');
                      router.navigate({ to: '/auth/sign-in' });
                    }}
                  >
                    <Icons.logout className='mr-2 h-4 w-4' />
                    {language === 'vi' ? 'Đăng xuất' : 'Sign out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Incident Modal */}
      <Dialog open={incidentModalOpen} onOpenChange={setIncidentModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-amber-600'>
              <Icons.warning className='size-5' />
              <span>Submit Platform Incident Report</span>
            </DialogTitle>
            <DialogDescription className='pt-1 text-xs text-muted-foreground'>
              Simulated emergency ticket dispatch for production cluster AP-Southeast-1.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-2 text-xs bg-muted/40 p-3 rounded-lg border border-border text-foreground'>
            <p>
              In production, this triggers an automated PagerDuty alert to the Platform Security
              &amp; Infrastructure team.
            </p>
            <p className='text-muted-foreground text-[11px]'>
              Severity level: P1 / High • Automated logs attachment enabled.
            </p>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setIncidentModalOpen(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleIncidentSubmit}>
              Trigger Incident Escalation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
