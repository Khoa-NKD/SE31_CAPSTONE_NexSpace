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
import { navGroups } from '@/config/nav-config';
import { useFilteredNavGroups } from '@/hooks/use-nav';
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

export default function AppSidebar() {
  const { pathname } = useLocation();
  const router = useRouter();
  const filteredGroups = useFilteredNavGroups(navGroups);
  const [incidentModalOpen, setIncidentModalOpen] = React.useState(false);

  const handleIncidentSubmit = () => {
    setIncidentModalOpen(false);
    toast.error('Incident Escalated (Simulated)', {
      description: 'Incident report dispatched to on-call platform engineers in AP-Southeast-1.'
    });
  };

  return (
    <>
      <Sidebar variant='inset' collapsible='icon' className='bg-[#090D16] text-slate-300 border-r border-[#1E293B]'>
        <SidebarHeader className='bg-[#090D16] border-b border-[#1E293B]/60 pb-3'>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size='lg' asChild className='hover:bg-[#1E293B]'>
                <Link to='/dashboard/overview' aria-label='Nex Space Admin Console — Dashboard'>
                  <div className='flex items-center gap-2'>
                    <NexSpaceLogo variant='admin' inverted aria-hidden='true' className='h-8 w-auto group-data-[collapsible=icon]:hidden' />
                    <NexSpaceLogo variant='mark' aria-hidden='true' className='size-7 hidden group-data-[collapsible=icon]:block mx-auto' />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Quick Incident CTA Button (Stitch line 154) */}
          <div className='px-2 pt-2'>
            <button
              type='button'
              onClick={() => setIncidentModalOpen(true)}
              className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#1E293B]/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-colors text-xs font-medium group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:mx-auto'
              title='System Incident Report'
            >
              <Icons.warning className='size-3.5 text-amber-400 shrink-0' />
              <span className='truncate group-data-[collapsible=icon]:hidden'>System Incident Report</span>
            </button>
          </div>
        </SidebarHeader>

        <SidebarContent className='overflow-x-hidden bg-[#090D16]'>
          {filteredGroups.map((group) => (
            <SidebarGroup key={group.label || 'ungrouped'} className='py-1.5'>
              {group.label && (
                <SidebarGroupLabel className='text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 group-data-[collapsible=icon]:hidden'>
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
                              className='group/collapsible hover:bg-[#1E293B] text-slate-300 hover:text-white'
                            >
                              {item.icon && <Icon className='size-4 shrink-0' />}
                              <span className='group-data-[collapsible=icon]:hidden'>{item.title}</span>
                              <Icons.chevronRight className='ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden' />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub className='border-[#1E293B]'>
                              {item.items?.map((subItem) => (
                                <SidebarMenuSubItem key={subItem.title}>
                                  <SidebarMenuSubButton asChild isActive={pathname === subItem.url} className='hover:bg-[#1E293B] text-slate-400 hover:text-white'>
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
                          className='cursor-not-allowed opacity-60 text-slate-400 hover:bg-[#1E293B]/40 hover:text-slate-400 aria-disabled:pointer-events-none'
                          aria-disabled='true'
                        >
                          {item.icon && <Icon className='size-4 shrink-0 text-slate-400' />}
                          <span className='truncate flex-1 group-data-[collapsible=icon]:hidden'>{item.title}</span>
                          {item.label === '20' ? (
                            <span className='ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 group-data-[collapsible=icon]:hidden'>
                              20
                            </span>
                          ) : (
                            <span className='ml-auto text-[9px] uppercase px-1.5 py-0.5 font-semibold bg-slate-800 text-slate-400 rounded border border-slate-700/60 group-data-[collapsible=icon]:hidden'>
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
                        className='hover:bg-[#1E293B] text-slate-300 hover:text-white data-[active=true]:bg-[#1E293B] data-[active=true]:text-white data-[active=true]:border-l-2 data-[active=true]:border-indigo-500'
                      >
                        <Link to={item.url} aria-label={item.title}>
                          {item.icon && <Icon className='size-4 shrink-0' />}
                          <span className='truncate group-data-[collapsible=icon]:hidden'>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className='bg-[#090D16] border-t border-[#1E293B]/60 p-2'>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size='lg'
                    className='hover:bg-[#1E293B] text-slate-300 data-[state=open]:bg-[#1E293B]'
                  >
                    <div className='relative size-8 rounded-full overflow-hidden bg-indigo-950 border border-indigo-500/40 shrink-0'>
                      <img
                        src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                        alt='Marcus Vance'
                        className='w-full h-full object-cover'
                      />
                    </div>
                    <div className='grid flex-1 text-left text-xs leading-tight min-w-0 group-data-[collapsible=icon]:hidden'>
                      <span className='truncate font-semibold text-white'>Marcus Vance</span>
                      <span className='text-slate-400 truncate text-[10px]'>CPTO • Super Admin</span>
                    </div>
                    <Icons.chevronsDown className='ml-auto size-3.5 text-slate-400 group-data-[collapsible=icon]:hidden' />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-[#090D16] text-slate-300 border-[#1E293B]'
                  side='bottom'
                  align='end'
                  sideOffset={4}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className='hover:bg-[#1E293B] focus:bg-[#1E293B] text-slate-300 focus:text-white cursor-pointer'
                      onClick={() => router.navigate({ to: '/dashboard/notifications' })}
                    >
                      <Icons.notification className='mr-2 h-4 w-4' />
                      Notifications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className='bg-[#1E293B]' />
                  <DropdownMenuItem
                    className='hover:bg-[#1E293B] focus:bg-[#1E293B] text-slate-300 focus:text-white cursor-pointer'
                    onClick={() => {
                      toast.info('Sign Out Simulated', {
                        description: 'Session invalidated in local state.'
                      });
                    }}
                  >
                    <Icons.logout className='mr-2 h-4 w-4' />
                    Sign out
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
              In production, this triggers an automated PagerDuty alert to the Platform Security &amp; Infrastructure team.
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
