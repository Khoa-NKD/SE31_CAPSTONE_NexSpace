import { useState } from 'react';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { NotificationCard } from '@/components/ui/notification-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from '@tanstack/react-router';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  useCustomerNotificationsQuery,
  useUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkBatchNotificationsReadMutation,
  useMarkAllNotificationsReadMutation,
  type UserNotificationDto
} from '../api/queries';
import { CheckCheck, CheckSquare, Square, RotateCcw } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: unreadCount = 0 } = useUnreadNotificationCountQuery(isAuthenticated);
  const { data: notificationsPage, isLoading } = useCustomerNotificationsQuery({
    page: 1,
    size: 50,
    unreadOnly: activeTab === 'unread' ? true : undefined,
    enabled: isAuthenticated
  });

  const markReadMutation = useMarkNotificationReadMutation();
  const markBatchReadMutation = useMarkBatchNotificationsReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const allItems: UserNotificationDto[] = notificationsPage?.content ?? [];
  const displayItems =
    activeTab === 'read'
      ? allItems.filter((n) => n.read)
      : activeTab === 'unread'
      ? allItems.filter((n) => !n.read)
      : allItems;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnread = () => {
    const unreadIds = displayItems.filter((n) => !n.read).map((n) => n.id);
    setSelectedIds(unreadIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchMarkAsRead = () => {
    if (selectedIds.length === 0) return;
    markBatchReadMutation.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([]);
      }
    });
  };

  const handleAction = (notification: UserNotificationDto) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    const isOrganizerOrAdmin = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

    if (notification.type === 'ORGANIZER_APPLICATION' || notification.relatedEntityType === 'OrganizerProfile') {
      if (isOrganizerOrAdmin) {
        router.navigate({ to: '/dashboard/organizer/application' });
      } else {
        router.navigate({ to: '/organizer/apply' });
      }
      return;
    }

    if (notification.type === 'REFUND') {
      if (isOrganizerOrAdmin) {
        router.navigate({ to: '/dashboard/organizer/bookings' });
      } else {
        router.navigate({ to: '/workspaces/my-bookings' });
      }
      return;
    }

    if (notification.type === 'BOOKING' || notification.type === 'PAYMENT' || notification.relatedEntityType === 'Booking' || notification.relatedEntityType === 'BOOKING' || notification.relatedEntityType === 'BOOKING_REMINDER') {
      if (isOrganizerOrAdmin && (notification.title.toLowerCase().includes('không gian của bạn') || notification.title.toLowerCase().includes('cần duyệt'))) {
        router.navigate({ to: '/dashboard/organizer/bookings' });
      } else {
        router.navigate({ to: '/workspaces/my-bookings' });
      }
    }
  };

  const getActionLabel = (notification: UserNotificationDto) => {
    if (notification.relatedEntityType === 'BOOKING_REMINDER' || notification.title.toLowerCase().includes('nhắc lịch')) {
      return 'Xem vé điện tử & PIN';
    }
    if (notification.type === 'ORGANIZER_APPLICATION' || notification.relatedEntityType === 'OrganizerProfile') {
      return 'Xem hồ sơ đối tác';
    }
    if (notification.type === 'REFUND') {
      return 'Xem chi tiết hoàn tiền';
    }
    return 'Xem chi tiết đơn';
  };

  const renderList = (items: UserNotificationDto[]) => {
    if (isLoading) {
      return (
        <div className='flex flex-col items-center justify-center py-16 gap-3'>
          <Icons.spinner className='h-8 w-8 animate-spin text-primary' />
          <p className='text-muted-foreground text-sm'>Đang tải thông báo...</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center py-16'>
          <Icons.notification className='text-muted-foreground/40 mb-3 h-10 w-10' />
          <p className='text-muted-foreground text-sm'>Không có thông báo nào</p>
        </div>
      );
    }

    return (
      <div className='flex flex-col gap-2'>
        {items.map((notification) => {
          const isSelected = selectedIds.includes(notification.id);
          return (
            <div key={notification.id} className='flex items-center gap-2 group'>
              <div className='shrink-0 pt-1'>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(notification.id)}
                  aria-label={`Chọn thông báo ${notification.id}`}
                  className='rounded-md border-border data-[state=checked]:bg-primary'
                />
              </div>
              <div className='flex-1 min-w-0'>
                <NotificationCard
                  id={String(notification.id)}
                  title={notification.title}
                  body={notification.content}
                  status={notification.read ? 'read' : 'unread'}
                  createdAt={notification.createdAt}
                  actions={[
                    {
                      id: 'view-target',
                      label: getActionLabel(notification),
                      type: 'redirect',
                      style: 'primary'
                    }
                  ]}
                  onMarkAsRead={(id) => markReadMutation.mutate(Number(id))}
                  onAction={() => handleAction(notification)}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageContainer
      pageTitle='Thông báo của bạn'
      pageDescription='Xem và quản lý các thông báo đặt chỗ, hồ sơ đối tác, hoàn tiền và tài khoản.'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          {selectedIds.length > 0 && (
            <Button
              variant='default'
              size='sm'
              disabled={markBatchReadMutation.isPending}
              onClick={handleBatchMarkAsRead}
              className='gap-1.5'
            >
              <CheckCheck className='h-3.5 w-3.5' />
              Đánh dấu đã đọc ({selectedIds.length})
            </Button>
          )}

          {unreadCount > 0 && (
            <Button
              variant='outline'
              size='sm'
              disabled={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}
              className='gap-1.5'
            >
              <CheckSquare className='h-3.5 w-3.5' />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
      }
    >
      {/* Batch Selection Action Bar */}
      {displayItems.length > 0 && (
        <div className='mb-3 flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground'>
          <div className='flex items-center gap-3'>
            <span>
              {selectedIds.length > 0
                ? `Đã chọn ${selectedIds.length} / ${displayItems.length} thông báo`
                : `${displayItems.length} thông báo`}
            </span>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-xs font-medium'
              onClick={handleSelectAllUnread}
            >
              Chọn các mục chưa đọc
            </Button>
            {selectedIds.length > 0 && (
              <Button
                variant='ghost'
                size='sm'
                className='h-6 px-2 text-xs font-medium text-rose-500 hover:text-rose-600'
                onClick={handleClearSelection}
              >
                Bỏ chọn
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val as 'all' | 'unread' | 'read');
        setSelectedIds([]);
      }}>
        <TabsList>
          <TabsTrigger value='all'>Tất cả ({allItems.length})</TabsTrigger>
          <TabsTrigger value='unread'>Chưa đọc ({unreadCount})</TabsTrigger>
          <TabsTrigger value='read'>Đã đọc ({allItems.filter((n) => n.read).length})</TabsTrigger>
        </TabsList>
        <TabsContent value='all' className='mt-4'>
          {renderList(displayItems)}
        </TabsContent>
        <TabsContent value='unread' className='mt-4'>
          {renderList(displayItems)}
        </TabsContent>
        <TabsContent value='read' className='mt-4'>
          {renderList(displayItems)}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
