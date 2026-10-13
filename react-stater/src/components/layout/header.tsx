import React from 'react';
import { SidebarTrigger } from '../ui/sidebar';
import SearchInput from '../search-input';
import { ThemeSelector } from '../themes/theme-selector';
import { ThemeModeToggle } from '../themes/theme-mode-toggle';
import { NotificationCenter } from '@/features/notifications/components/notification-center';
import { Badge } from '../ui/badge';
import { ShieldCheck, Activity } from 'lucide-react';

export default function Header() {
  return (
    <header className='bg-background/80 sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2.5 sm:gap-4 border-b border-border/70 backdrop-blur-md px-3 sm:px-4'>
      {/* Left: Sidebar trigger + Prominent Global Search */}
      <div className='flex items-center gap-2 sm:gap-3 min-w-0 flex-1 max-w-xs sm:max-w-sm md:max-w-md'>
        <SidebarTrigger className='-ml-1 shrink-0' />
        <div className='flex-1 min-w-0'>
          <SearchInput />
        </div>
      </div>

      {/* Right: Cluster Telemetry + Admin Role + Theme Controls + Notifications */}
      <div className='flex items-center gap-1.5 sm:gap-2.5 shrink-0'>
        {/* Cluster Telemetry Status (AP-Southeast-1 Node & SLA) */}
        <div className='hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/40 border border-border/60 text-xs text-muted-foreground shrink-0'>
          <span className='relative flex h-2 w-2 shrink-0'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
            <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
          </span>
          <span className='font-mono text-[11px] font-medium text-foreground/90 whitespace-nowrap'>
            AP-Southeast-1 (HCM)
          </span>
          <span className='text-border'>|</span>
          <span className='font-mono text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0'>
            <Activity className='h-3 w-3' />
            18ms
          </span>
          <span className='text-border hidden xl:inline'>|</span>
          <span className='hidden xl:flex items-center gap-1 text-[11px] font-medium text-foreground/80 shrink-0'>
            <ShieldCheck className='h-3.5 w-3.5 text-blue-500' />
            99.98% Uptime
          </span>
        </div>

        {/* Administrator Role Indicator */}
        <div className='hidden sm:flex items-center shrink-0'>
          <Badge
            variant='outline'
            className='font-mono text-[10px] tracking-wider font-semibold border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 whitespace-nowrap'
          >
            SUPER ADMIN
          </Badge>
        </div>

        {/* Theme Mode Toggle (Light/Dark) */}
        <ThemeModeToggle />

        {/* Theme Palette Selector */}
        <div className='hidden md:block'>
          <ThemeSelector />
        </div>

        {/* Notification Center */}
        <NotificationCenter />
      </div>
    </header>
  );
}
