import React, { useMemo } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  useCustomerNotificationsQuery,
  useUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  type UserNotificationDto
} from '../api/queries';
import { useLanguage } from '@/features/landing/context/language-context';
import { Check, CheckCheck, CreditCard, CalendarCheck, AlertCircle, Bell, ExternalLink, RotateCcw, Building2, ShieldCheck, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function NotificationCenter() {
  const { language } = useLanguage();
  const isVi = language === 'vi';
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const { data: unreadCount = 0 } = useUnreadNotificationCountQuery(isAuthenticated);
  const { data: notificationsPage, isLoading } = useCustomerNotificationsQuery({
    page: 1,
    size: 15,
    enabled: isAuthenticated
  });

  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const notifications: UserNotificationDto[] = useMemo(() => {
    const raw = notificationsPage?.content ?? [];
    return [...raw].sort((a, b) => {
      if (a.read !== b.read) {
        return a.read ? 1 : -1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notificationsPage]);

  if (!isAuthenticated) {
    return null;
  }

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return isVi ? 'Vừa xong' : 'Just now';
      if (diffMins < 60) return isVi ? `${diffMins} phút trước` : `${diffMins}m ago`;
      if (diffHours < 24) return isVi ? `${diffHours} giờ trước` : `${diffHours}h ago`;
      if (diffDays < 7) return isVi ? `${diffDays} ngày trước` : `${diffDays}d ago`;

      return d.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleNotificationClick = (item: UserNotificationDto) => {
    if (!item.read) {
      markReadMutation.mutate(item.id);
    }
    const isOrganizer = user?.role === 'ORGANIZER';
    const isAdmin = user?.role === 'ADMIN';

    if (item.type === 'ORGANIZER_APPLICATION' || item.relatedEntityType === 'OrganizerProfile') {
      if (isOrganizer || isAdmin) {
        router.navigate({ to: '/dashboard/organizer/application' });
      } else {
        router.navigate({ to: '/organizer/apply' });
      }
      return;
    }

    if (item.type === 'REFUND') {
      if (isAdmin) {
        router.navigate({ to: '/dashboard/admin/refunds' });
      } else {
        router.navigate({ to: '/workspaces/my-bookings' });
      }
      return;
    }

    if (item.type === 'WORKSPACE_REVIEW') {
      if (isOrganizer) {
        router.navigate({ to: '/dashboard/organizer/workspaces' });
      } else {
        router.navigate({ to: '/workspaces' });
      }
      return;
    }

    if (item.type === 'COMPLAINT') {
      if (isOrganizer) {
        router.navigate({ to: '/dashboard/organizer/bookings' });
      } else {
        router.navigate({ to: '/workspaces/my-bookings' });
      }
      return;
    }

    // Route to appropriate view based on role and notification content
    if (item.type === 'BOOKING' || item.type === 'PAYMENT' || item.relatedEntityType === 'Booking' || item.relatedEntityType === 'BOOKING' || item.relatedEntityType === 'BOOKING_REMINDER') {
      if (isOrganizer && (item.title.toLowerCase().includes('không gian của bạn') || item.title.toLowerCase().includes('cần duyệt') || item.title.toLowerCase().includes('đã bị hủy'))) {
        router.navigate({ to: '/dashboard/organizer/bookings' });
      } else {
        router.navigate({ to: '/workspaces/my-bookings' });
      }
    }
  };

  const getNotificationIcon = (type: string, title: string) => {
    const isFailed = title.toLowerCase().includes('không thành công') || title.toLowerCase().includes('thất bại') || title.toLowerCase().includes('failed');
    const isCancelled = title.toLowerCase().includes('hủy') || title.toLowerCase().includes('cancel');
    const isReminder = title.toLowerCase().includes('nhắc lịch') || title.toLowerCase().includes('sắp bắt đầu');
    const isNewForOrganizer = title.toLowerCase().includes('không gian của bạn') || title.toLowerCase().includes('cần duyệt');

    if (type === 'WORKSPACE_REVIEW') {
      return (
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20'>
          <Sparkles className='h-4 w-4' />
        </div>
      );
    }

    if (type === 'COMPLAINT') {
      return (
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20'>
          <AlertCircle className='h-4 w-4' />
        </div>
      );
    }

    if (type === 'ORGANIZER_APPLICATION') {
      if (title.toLowerCase().includes('phê duyệt') || title.toLowerCase().includes('approved')) {
        return (
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20'>
            <ShieldCheck className='h-4 w-4' />
          </div>
        );
      }
      return (
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20'>
          <ShieldCheck className='h-4 w-4' />
        </div>
      );
    }

    if (type === 'REFUND') {
      if (title.toLowerCase().includes('yêu cầu') || title.toLowerCase().includes('request')) {
        return (
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20'>
            <RotateCcw className='h-4 w-4' />
          </div>
        );
      }
      return (
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20'>
          <RotateCcw className='h-4 w-4' />
        </div>
      );
    }

    if (type === 'BOOKING') {
      if (isReminder) {
        return (
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20'>
            <Clock className='h-4 w-4' />
          </div>
        );
      }
      if (isCancelled) {
        return (
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20'>
            <AlertCircle className='h-4 w-4' />
          </div>
        );
      }
      if (isNewForOrganizer) {
        return (
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20'>
            <Building2 className='h-4 w-4' />
          </div>
        );
      }
      return (
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20'>
          <CalendarCheck className='h-4 w-4' />
        </div>
      );
    }
    if (type === 'PAYMENT') {
      if (isFailed) {
        return (
          <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 dark:bg-rose-500/20'>
            <AlertCircle className='h-4 w-4' />
          </div>
        );
      }
      return (
        <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20'>
          <CreditCard className='h-4 w-4' />
        </div>
      );
    }
    return (
      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 dark:bg-sky-500/20'>
        <Bell className='h-4 w-4' />
      </div>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative h-9 w-9 rounded-xl border border-slate-200/80 bg-white/60 hover:bg-slate-100 text-slate-700 transition-all dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800'
          aria-label={isVi ? 'Thông báo' : 'Notifications'}
        >
          <Icons.notification className='h-4.5 w-4.5' />

          {/* Unread badge & arrival indicator pulse */}
          {unreadCount > 0 && (
            <>
              <span className='absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in-50 duration-200'>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
              <span className='absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-rose-400 opacity-75 animate-ping' />
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align='end'
        className='w-[calc(100vw-2rem)] p-0 sm:w-[400px] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl dark:border-slate-800 dark:bg-slate-950/95 overflow-hidden'
        sideOffset={8}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200/70 dark:border-slate-800/70'>
          <div className='flex items-center gap-2'>
            <h4 className='text-sm font-bold text-slate-900 dark:text-white'>
              {isVi ? 'Thông báo' : 'Notifications'}
            </h4>
            {unreadCount > 0 ? (
              <span className='rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'>
                {unreadCount} {isVi ? 'chưa đọc' : 'new'}
              </span>
            ) : (
              <span className='rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400'>
                {isVi ? 'Đã xem hết' : 'Up to date'}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 px-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50'
              disabled={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
            >
              <CheckCheck className='h-3.5 w-3.5 mr-1' />
              {isVi ? 'Đọc tất cả' : 'Mark all read'}
            </Button>
          )}
        </div>

        {/* Notifications Scroll Area */}
        <ScrollArea className='max-h-[420px] overflow-y-auto'>
          {isLoading ? (
            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground gap-2'>
              <Icons.spinner className='h-6 w-6 animate-spin text-indigo-500' />
              <p className='text-xs'>{isVi ? 'Đang tải thông báo...' : 'Loading notifications...'}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
              <div className='h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3 text-slate-400'>
                <Bell className='h-6 w-6' />
              </div>
              <p className='text-sm font-semibold text-slate-800 dark:text-slate-200'>
                {isVi ? 'Chưa có thông báo nào' : 'No notifications yet'}
              </p>
              <p className='text-xs text-slate-500 dark:text-slate-400 max-w-[260px] mt-1'>
                {isVi
                  ? 'Khi bạn thực hiện đặt chỗ hoặc thanh toán qua PayOS, cập nhật sẽ hiển thị tại đây.'
                  : 'When you make a booking or complete a payment, real-time updates will arrive here.'}
              </p>
            </div>
          ) : (
            <div className='divide-y divide-slate-100 dark:divide-slate-800/60'>
              {notifications.map((item) => (
                <div
                  key={item.id}
                  role='button'
                  tabIndex={0}
                  onClick={() => handleNotificationClick(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                  className={cn(
                    'group relative flex items-start gap-3 p-3.5 cursor-pointer transition-colors text-left',
                    item.read
                      ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      : 'bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30'
                  )}
                >
                  {/* Icon */}
                  {getNotificationIcon(item.type, item.title)}

                  {/* Body Content */}
                  <div className='flex-1 min-w-0 pr-6'>
                    <div className='flex items-center gap-1.5'>
                      <h5
                        className={cn(
                          'text-xs font-semibold leading-tight line-clamp-1',
                          item.read
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-900 dark:text-white font-bold'
                        )}
                      >
                        {item.title}
                      </h5>
                      {!item.read && (
                        <span className='h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0' />
                      )}
                    </div>
                    <p className='mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed'>
                      {item.content}
                    </p>
                    <div className='mt-1.5 flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500'>
                      <span>{formatTimeAgo(item.createdAt)}</span>
                      <span>•</span>
                      <span className='inline-flex items-center gap-0.5 text-indigo-500 dark:text-indigo-400 group-hover:underline'>
                        {isVi ? 'Xem chi tiết' : 'View details'}
                        <ExternalLink className='h-2.5 w-2.5' />
                      </span>
                    </div>
                  </div>

                  {/* Mark as read button */}
                  {!item.read && (
                    <button
                      type='button'
                      title={isVi ? 'Xác nhận đã đọc' : 'Mark as read'}
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(item.id);
                      }}
                      className='absolute top-3.5 right-3 h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/70 dark:hover:bg-indigo-950 dark:hover:text-indigo-400 transition-colors'
                    >
                      <Check className='h-3.5 w-3.5' />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className='p-2 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-200/70 dark:border-slate-800/70 text-center'>
          <button
            type='button'
            onClick={() => router.navigate({ to: '/workspaces/my-bookings' })}
            className='w-full py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors'
          >
            {isVi ? 'Quản lý tất cả đơn đặt chỗ →' : 'Manage all my bookings →'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
