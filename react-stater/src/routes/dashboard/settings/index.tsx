import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import ProfileSettingsView from '@/features/settings/components/profile-settings-view';

export const Route = createFileRoute('/dashboard/settings/')({
  head: () => ({
    meta: [
      { title: 'Cài đặt tài khoản & Bảo mật | NexSpace' },
      {
        name: 'description',
        content: 'Quản lý thông tin cá nhân, cập nhật mật khẩu, và kiểm tra trạng thái bảo mật tài khoản NexSpace.'
      }
    ]
  }),
  component: SettingsPage
});

function SettingsPage() {
  return (
    <PageContainer
      pageTitle='Cài đặt tài khoản & Bảo mật'
      pageDescription='Quản lý thông tin định danh cá nhân, cập nhật mật khẩu và giám sát an toàn tài khoản theo tiêu chuẩn bảo mật NexSpace.'
    >
      <ProfileSettingsView />
    </PageContainer>
  );
}

