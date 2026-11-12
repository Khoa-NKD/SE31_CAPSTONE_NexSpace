import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import ProfileManagementView from '@/features/profile/components/profile-management-view';

export const Route = createFileRoute('/dashboard/settings/')({
  head: () => ({
    meta: [
      { title: 'Quản lý hồ sơ & Cài đặt bảo mật | NexSpace' },
      {
        name: 'description',
        content: 'Quản lý thông tin hồ sơ cá nhân, ảnh đại diện, cập nhật mật khẩu và giám sát an toàn tài khoản NexSpace.'
      }
    ]
  }),
  component: SettingsPage
});

function SettingsPage() {
  return (
    <PageContainer
      pageTitle='Hồ sơ cá nhân & Cài đặt'
      pageDescription='Quản lý thông tin định danh cá nhân, ảnh đại diện, bảo mật mật khẩu và giám sát an toàn tài khoản theo tiêu chuẩn NexSpace.'
    >
      <ProfileManagementView />
    </PageContainer>
  );
}

