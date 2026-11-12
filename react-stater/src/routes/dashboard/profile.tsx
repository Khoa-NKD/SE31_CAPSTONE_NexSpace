import { createFileRoute } from '@tanstack/react-router';
import PageContainer from '@/components/layout/page-container';
import ProfileManagementView from '@/features/profile/components/profile-management-view';

export const Route = createFileRoute('/dashboard/profile')({
  head: () => ({
    meta: [
      { title: 'Hồ sơ cá nhân & Cài đặt | NexSpace' },
      {
        name: 'description',
        content: 'Xem và cập nhật hồ sơ cá nhân, quản lý ảnh đại diện và an toàn tài khoản NexSpace.'
      }
    ]
  }),
  component: ProfilePage
});

function ProfilePage() {
  return (
    <PageContainer
      pageTitle='Hồ sơ cá nhân'
      pageDescription='Quản lý thông tin định danh cá nhân, ảnh đại diện và trạng thái tài khoản theo tiêu chuẩn NexSpace.'
    >
      <ProfileManagementView />
    </PageContainer>
  );
}

